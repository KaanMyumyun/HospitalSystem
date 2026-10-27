using HospitalSystem.Interfaces;
using HospitalSystem.Services;
using HospitalSystem.Services.Appointments;
using HospitalSystem.Services.Auth;
using HospitalSystem.Services.Calendar;
using HospitalSystem.Services.User;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using Npgsql;

namespace HospitalSystem.Tests;

// The same code against real PostgreSQL, with the real migrations applied.
public class PostgresTests : AuthTestBase
{
    private static readonly DateTimeOffset LockoutTime = new(2026, 10, 23, 12, 0, 0, TimeSpan.Zero);

    private LoginService CreateLoginService(ApplicationDbContext db, IPasswordHasher<UserEntity> hasher) =>
        new(db, CreateJwtOptions(), CreateDemoOptions(), new AuditLogService(db, Nobody()), hasher, new FixedClock(LockoutTime));

    private static async Task<int> SeedLoginUserAsync(PostgresDatabase database, int failedCount)
    {
        await using var db = await database.CreateMigratedContextAsync();
        var user = new UserEntity { Name = "lockout", Role = UserRole.Admin, FailedSignInCount = failedCount };
        user.PasswordHash = new PasswordHasher<UserEntity>().HashPassword(user, TestPassword);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user.Id;
    }

    // Pauses the first request after it has read the user. Without row locking,
    // the second request can then save against that same old account state.
    private sealed class PausedWrongPasswordHasher : IPasswordHasher<UserEntity>
    {
        private readonly TaskCompletionSource<bool> _entered = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource<bool> _release = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task Entered => _entered.Task;
        public void Release() => _release.TrySetResult(true);
        public string HashPassword(UserEntity user, string password) => throw new NotSupportedException();

        public PasswordVerificationResult VerifyHashedPassword(UserEntity user, string hashedPassword, string providedPassword)
        {
            _entered.TrySetResult(true);
            _release.Task.GetAwaiter().GetResult();
            return PasswordVerificationResult.Failed;
        }
    }

    private static async Task WaitForBlockedAccountLockAsync(
        PostgresDatabase database, Task otherRequest, PausedWrongPasswordHasher paused)
    {
        try
        {
            var deadline = DateTime.UtcNow.AddSeconds(10);
            while (DateTime.UtcNow < deadline)
            {
                if (otherRequest.IsCompleted)
                {
                    await otherRequest;
                    throw new InvalidOperationException("The competing account update completed without waiting for the row lock");
                }

                var waiting = await database.ScalarAsync<long>("""
                    SELECT count(*) FROM pg_stat_activity
                    WHERE datname = current_database()
                      AND wait_event_type = 'Lock'
                      AND query LIKE '%FOR UPDATE%'
                    """);
                if (waiting > 0)
                    return;

                await Task.Delay(25);
            }

            throw new TimeoutException("The competing account update did not reach the row lock");
        }
        finally
        {
            paused.Release();
        }
    }

    private static PostgresException UniqueViolation(DbUpdateException exception)
    {
        var postgres = Assert.IsType<PostgresException>(exception.InnerException);
        Assert.Equal(PostgresErrorCodes.UniqueViolation, postgres.SqlState);
        return postgres;
    }

    private static async Task<(int DoctorId, int DeskId, int PatientId)> SeedBookableDoctorAsync(ApplicationDbContext db)
    {
        var department = new DepartmentEntity { Name = "Cardiology", IsActive = true };
        var doctorUser = new UserEntity { Name = "drhouse", PasswordHash = "x", Role = UserRole.Doctor };
        var desk = new UserEntity { Name = "desk", PasswordHash = "x", Role = UserRole.FrontDesk };
        var doctor = new DoctorEntity { User = doctorUser, Department = department, IsActive = true };
        var patient = new PatientEntity { Name = "Maria Ivanova", PhoneNumber = "0888111222", DateOfBirth = new DateOnly(1990, 5, 17) };
        db.AddRange(desk, doctor, patient);
        db.Calendars.Add(new CalendarEntity
        {
            Doctor = doctor,
            StartTime = new DateTime(2000, 1, 1, 8, 0, 0, DateTimeKind.Utc),
            EndTime = new DateTime(2000, 1, 1, 18, 0, 0, DateTimeKind.Utc),
            SlotDurationMin = 30
        });
        await db.SaveChangesAsync();
        return (doctor.Id, desk.Id, patient.Id);
    }

    [PostgresFact]
    public async Task EveryMigration_AppliesToAnEmptyDatabase_AndMatchesTheModel()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = await database.CreateMigratedContextAsync();

        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        Assert.False(db.Database.HasPendingModelChanges());
    }

    // Three migrations that did nothing were deleted. A database that applied
    // them keeps their history rows, which EF leaves alone.
    [PostgresFact]
    public async Task ADatabaseThatAppliedTheDeletedEmptyMigrations_StillMigrates()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = await database.CreateMigratedContextAsync();
        await database.ExecuteAsync("""
            INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion") VALUES
                ('20260106163944_..', '8.0.0'),
                ('20260216193104_UpdateDoctorScheduleModel', '8.0.0'),
                ('20260217143525_AddCalendarScheduleS', '8.0.0');
            """);

        await db.Database.MigrateAsync();

        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
    }

    [PostgresFact]
    public async Task Usernames_AreUniqueIgnoringCase()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using (var db = await database.CreateMigratedContextAsync())
        {
            db.Users.Add(new UserEntity { Name = "admin", PasswordHash = "x", Role = UserRole.Admin });
            await db.SaveChangesAsync();
        }
        await using var second = database.CreateContext();
        second.Users.Add(new UserEntity { Name = "ADMIN", PasswordHash = "x", Role = UserRole.FrontDesk });

        var error = await Assert.ThrowsAsync<DbUpdateException>(() => second.SaveChangesAsync());

        Assert.Equal("IX_Users_LowerName", UniqueViolation(error).ConstraintName);
    }

    [PostgresFact]
    public async Task DepartmentNames_AreUniqueIgnoringCase()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using (var db = await database.CreateMigratedContextAsync())
        {
            db.Departments.Add(new DepartmentEntity { Name = "Cardiology", IsActive = true });
            await db.SaveChangesAsync();
        }
        await using var second = database.CreateContext();
        second.Departments.Add(new DepartmentEntity { Name = "cardiology", IsActive = true });

        var error = await Assert.ThrowsAsync<DbUpdateException>(() => second.SaveChangesAsync());

        Assert.Equal("IX_Departments_LowerDepartment", UniqueViolation(error).ConstraintName);
    }

    // The migration cannot choose which of two such departments to keep, so it
    // stops, changes nothing, and runs once they are renamed.
    [PostgresFact]
    public async Task CaseInsensitiveDepartmentNames_StopsWhileNamesDifferOnlyInCase()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = database.CreateContext();
        await db.GetService<IMigrator>().MigrateAsync("AddSignInLockout");
        await database.ExecuteAsync("""INSERT INTO "Departments" ("Department", "IsActive") VALUES ('Cardiology', true), ('cardiology', true)""");

        var error = await Assert.ThrowsAsync<PostgresException>(() => db.Database.MigrateAsync());

        Assert.Equal("P0001", error.SqlState);
        Assert.Contains("differ only in case", error.MessageText);
        Assert.Equal(1L, await database.ScalarAsync<long>("""SELECT count(*) FROM pg_indexes WHERE indexname = 'IX_Departments_Department'"""));
        Assert.Equal(0L, await database.ScalarAsync<long>("""SELECT count(*) FROM pg_indexes WHERE indexname = 'IX_Departments_LowerDepartment'"""));

        await database.ExecuteAsync("""UPDATE "Departments" SET "Department" = 'Cardiology (old)' WHERE "Department" = 'cardiology'""");
        await db.Database.MigrateAsync();
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
    }

    [PostgresFact]
    public async Task ADoctor_CannotHaveTwoScheduledAppointmentsAtOnce_ButACancelledOneLeavesTheSlotFree()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = await database.CreateMigratedContextAsync();
        var (doctorId, deskId, patientId) = await SeedBookableDoctorAsync(db);
        var time = new DateTime(2030, 1, 7, 9, 0, 0, DateTimeKind.Utc);
        AppointmentEntity Booking(AppointmentStatus status) => new()
        {
            DoctorId = doctorId, PatientId = patientId, CreatedByTheFrontDeskId = deskId,
            TimeOfAppointment = time, CreatedAt = DateTime.UtcNow, Status = status
        };

        db.Appointments.AddRange(Booking(AppointmentStatus.Cancelled), Booking(AppointmentStatus.Scheduled));
        await db.SaveChangesAsync();
        db.Appointments.Add(Booking(AppointmentStatus.Scheduled));

        var error = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        UniqueViolation(error);
    }

    [PostgresFact]
    public async Task BookingATakenSlotThroughTheService_IsAConflict()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = await database.CreateMigratedContextAsync();
        var (doctorId, deskId, _) = await SeedBookableDoctorAsync(db);
        var desk = new Mock<ICurrentUserService>();
        desk.Setup(x => x.IsInRole(UserRole.FrontDesk)).Returns(true);
        desk.Setup(x => x.UserId).Returns(deskId.ToString());
        var service = new AppointmentCreationService(db, desk.Object, new PatientService(db), new AuditLogService(db, desk.Object),
            new FixedClock(new DateTimeOffset(2030, 1, 1, 0, 0, 0, TimeSpan.Zero)));
        var booking = new CreateAppointmentDto
        {
            DoctorId = doctorId,
            PatientName = "Ivan Petrov",
            PhoneNumber = "0899000111",
            DateOfBirth = new DateOnly(1985, 3, 4),
            AppointmentTime = new DateTimeOffset(2030, 1, 7, 9, 0, 0, TimeSpan.Zero)
        };

        Assert.True((await service.CreateAppointmentAsync(booking)).IsSuccess);
        var second = await service.CreateAppointmentAsync(booking);

        Assert.Equal(FailureKind.Conflict, second.Failure);
        Assert.Equal(1, await db.Appointments.CountAsync());
    }

    [PostgresFact]
    public async Task ADoctor_HasOneSchedule()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = await database.CreateMigratedContextAsync();
        var (doctorId, _, _) = await SeedBookableDoctorAsync(db);
        var second = new CalendarEntity { DoctorId = doctorId, SlotDurationMin = 30 };
        second.SetHours(13, 17);
        db.Calendars.Add(second);

        var error = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());

        Assert.Equal("IX_Calendars_DoctorId", UniqueViolation(error).ConstraintName);
    }

    // Two admins create a schedule for one doctor at the same time: both pass
    // the check, and the database refuses the second, which gets the message
    // the check gives.
    [PostgresFact]
    public async Task CreatingTwoSchedulesForADoctorAtOnce_TheSecondIsAConflict()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        int doctorId;
        await using (var setup = await database.CreateMigratedContextAsync())
        {
            (doctorId, _, _) = await SeedBookableDoctorAsync(setup);
            await database.ExecuteAsync("""DELETE FROM "Calendars" """);
        }
        var competing = new CompetingScheduleInterceptor(database, doctorId);
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(database.ConnectionString)
            .AddInterceptors(competing)
            .Options);
        var admin = new Mock<ICurrentUserService>();
        admin.Setup(x => x.IsInRole(UserRole.Admin)).Returns(true);
        var service = new ScheduleCreationService(db, admin.Object, new AuditLogService(db, admin.Object));

        var result = await service.CreateScheduleAsync(new CreateSchedule { DoctorId = doctorId, StartHour = 8, EndHour = 16, SlotDurationMin = 30 });

        Assert.True(competing.Inserted);
        Assert.Equal(FailureKind.Conflict, result.Failure);
        Assert.Equal(ScheduleValidation.AlreadyScheduled, result.Error);
        Assert.Equal(1L, await database.ScalarAsync<long>("""SELECT count(*) FROM "Calendars" """));
        Assert.Equal(0L, await database.ScalarAsync<long>("""SELECT count(*) FROM "AuditLogs" """));
    }

    // Inserts another schedule for the doctor just before the service saves
    // its own, as a request from another admin would.
    private sealed class CompetingScheduleInterceptor(PostgresDatabase database, int doctorId) : SaveChangesInterceptor
    {
        public bool Inserted { get; private set; }

        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (!Inserted && eventData.Context!.ChangeTracker.Entries<CalendarEntity>().Any(e => e.State == EntityState.Added))
            {
                Inserted = true;
                await database.ExecuteAsync($"""
                    INSERT INTO "Calendars" ("DoctorId", "StartTime", "EndTime", "SlotDurationMin")
                    VALUES ({doctorId}, '2000-01-01 09:00+00', '2000-01-01 17:00+00', 60)
                    """);
            }
            return result;
        }
    }

    // The migration cannot choose which of a doctor's schedules to keep, so it
    // stops, changes nothing, and runs once all but one are deleted.
    [PostgresFact]
    public async Task OneSchedulePerDoctor_StopsWhileADoctorHasTwo()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = database.CreateContext();
        await db.GetService<IMigrator>().MigrateAsync("CaseInsensitiveDepartmentNames");
        await database.ExecuteAsync("""
            INSERT INTO "Departments" ("Department", "IsActive") VALUES ('Cardiology', true);
            INSERT INTO "Users" ("Name", "PasswordHash", "Role", "SecurityStamp") VALUES ('drhouse', 'x', 'Doctor', 's');
            INSERT INTO "Doctors" ("DepartmentId", "UserId", "IsActive") SELECT d."Id", u."Id", true FROM "Departments" d, "Users" u;
            INSERT INTO "Calendars" ("DoctorId", "StartTime", "EndTime", "SlotDurationMin")
            SELECT "Id", '2000-01-01 08:00+00'::timestamptz, '2000-01-01 12:00+00'::timestamptz, 30 FROM "Doctors"
            UNION ALL SELECT "Id", '2000-01-01 13:00+00'::timestamptz, '2000-01-01 17:00+00'::timestamptz, 30 FROM "Doctors";
            """);

        var error = await Assert.ThrowsAsync<PostgresException>(() => db.Database.MigrateAsync());

        Assert.Equal("P0001", error.SqlState);
        Assert.Contains("more than one schedule", error.MessageText);
        Assert.Equal(0L, await database.ScalarAsync<long>("""SELECT count(*) FROM pg_indexes WHERE indexdef LIKE 'CREATE UNIQUE INDEX "IX_Calendars_DoctorId"%'"""));

        await database.ExecuteAsync("""DELETE FROM "Calendars" WHERE "Id" = (SELECT max("Id") FROM "Calendars")""");
        await db.Database.MigrateAsync();
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
    }

    // Changing a schedule used to store it on the day of the change, and
    // schedules older than slot lengths have none. The repair keeps the times
    // of day, an end at midnight, and the 30 minutes the calendar showed.
    [PostgresFact]
    public async Task RepairScheduleRows_MovesHoursToOneDate_AndFillsMissingSlotLengths()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = database.CreateContext();
        await db.GetService<IMigrator>().MigrateAsync("OneSchedulePerDoctor");
        await database.ExecuteAsync("""
            INSERT INTO "Departments" ("Department", "IsActive") VALUES ('Cardiology', true);
            INSERT INTO "Users" ("Name", "PasswordHash", "Role", "SecurityStamp") VALUES ('drone', 'x', 'Doctor', 's1'), ('drtwo', 'x', 'Doctor', 's2');
            INSERT INTO "Doctors" ("DepartmentId", "UserId", "IsActive") SELECT d."Id", u."Id", true FROM "Departments" d, "Users" u ORDER BY u."Id";
            INSERT INTO "Calendars" ("DoctorId", "StartTime", "EndTime", "SlotDurationMin")
            SELECT min("Id"), '2026-10-25 16:00+00'::timestamptz, '2026-10-26 00:00+00'::timestamptz, 15 FROM "Doctors"
            UNION ALL SELECT max("Id"), '2000-01-01 08:00+00'::timestamptz, '2000-01-01 16:00+00'::timestamptz, 0 FROM "Doctors";
            """);

        await db.Database.MigrateAsync();

        var schedules = await db.Calendars.OrderBy(c => c.DoctorId).ToListAsync();
        Assert.Equal(CalendarEntity.HoursDate.AddHours(16), schedules[0].StartTime);
        Assert.Equal(CalendarEntity.HoursDate.AddDays(1), schedules[0].EndTime);
        Assert.Equal(15, schedules[0].SlotDurationMin);
        Assert.Equal(CalendarEntity.HoursDate.AddHours(8), schedules[1].StartTime);
        Assert.Equal(CalendarEntity.HoursDate.AddHours(16), schedules[1].EndTime);
        Assert.Equal(30, schedules[1].SlotDurationMin);
    }

    [PostgresFact]
    public async Task ColumnLengths_HoldInTheDatabaseToo()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = await database.CreateMigratedContextAsync();
        db.Patients.Add(new PatientEntity { Name = new string('a', 51), PhoneNumber = "0888111222", DateOfBirth = new DateOnly(1990, 1, 1) });

        var error = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());

        Assert.Equal(PostgresErrorCodes.StringDataRightTruncation, Assert.IsType<PostgresException>(error.InnerException).SqlState);
    }

    [PostgresFact]
    public async Task DepartmentNames_HoldAtMost100Characters()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = await database.CreateMigratedContextAsync();
        db.Departments.Add(new DepartmentEntity { Name = new string('a', 100), IsActive = true });
        await db.SaveChangesAsync();
        db.Departments.Add(new DepartmentEntity { Name = new string('b', 101), IsActive = true });

        var error = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());

        Assert.Equal(PostgresErrorCodes.StringDataRightTruncation, Assert.IsType<PostgresException>(error.InnerException).SqlState);
    }

    // The migration cannot shorten a name well, so it stops, changes nothing,
    // and runs once the name is shortened by hand.
    [PostgresFact]
    public async Task LimitDepartmentNameLength_StopsWhileANameIsTooLong()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = database.CreateContext();
        await db.GetService<IMigrator>().MigrateAsync("RepairScheduleRows");
        await database.ExecuteAsync($"""INSERT INTO "Departments" ("Department", "IsActive") VALUES ('{new string('a', 101)}', true)""");

        var error = await Assert.ThrowsAsync<PostgresException>(() => db.Database.MigrateAsync());

        Assert.Equal("P0001", error.SqlState);
        Assert.Contains("longer than 100 characters", error.MessageText);
        Assert.Equal("text", await database.ScalarAsync<string>("""SELECT data_type FROM information_schema.columns WHERE table_name = 'Departments' AND column_name = 'Department'"""));

        await database.ExecuteAsync("""UPDATE "Departments" SET "Department" = 'Cardiology'""");
        await db.Database.MigrateAsync();
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
    }

    // Entries named their actor by user id. The migration keeps the id in
    // ActorUserId and puts the username in ActorName; "Unknown" and the id of
    // no user stay as they were.
    [PostgresFact]
    public async Task AddAuditLogActorUserId_NamesTheActorsOfEarlierEntries()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = database.CreateContext();
        await db.GetService<IMigrator>().MigrateAsync("LimitDepartmentNameLength");
        await database.ExecuteAsync("""
            INSERT INTO "Users" ("Name", "PasswordHash", "Role", "SecurityStamp") VALUES ('alice', 'x', 'Admin', 's');
            INSERT INTO "AuditLogs" ("Action", "EntityType", "EntityId", "Details", "ActorName", "CreatedAt")
            SELECT 'CreateUser', 'User', 1, 'Created user bob', "Id"::text, now() FROM "Users";
            INSERT INTO "AuditLogs" ("Action", "EntityType", "EntityId", "Details", "ActorName", "CreatedAt") VALUES
                ('SignInFailed', 'User', 0, 'Failed sign-in with an unknown username', 'Unknown', now()),
                ('ResetPassword', 'User', 1, 'Password reset for user bob', '999', now());
            """);

        await db.Database.MigrateAsync();

        var aliceId = await db.Users.Select(u => u.Id).SingleAsync();
        var entries = await db.AuditLogs.OrderBy(a => a.Id).ToListAsync();
        Assert.Equal([aliceId, null, null], entries.Select(e => e.ActorUserId));
        Assert.Equal(["alice", "Unknown", "999"], entries.Select(e => e.ActorName));
    }

    // During a deploy or after a rollback, an image without the newest
    // columns still inserts rows: each new column has a default.
    [PostgresFact]
    public async Task AnOlderImage_CanStillInsertUsersAndSchedules()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = await database.CreateMigratedContextAsync();
        await SeedBookableDoctorAsync(db);
        var doctorId = await db.Doctors.Select(d => d.Id).SingleAsync();

        await database.ExecuteAsync("""INSERT INTO "Users" ("Name", "PasswordHash", "Role", "SecurityStamp") VALUES ('old-image', 'x', 'Pending', 's')""");
        await database.ExecuteAsync($"""DELETE FROM "Calendars"; INSERT INTO "Calendars" ("DoctorId", "StartTime", "EndTime", "SlotDurationMin") VALUES ({doctorId}, '2000-01-01 08:00+00', '2000-01-01 16:00+00', 30)""");

        db.ChangeTracker.Clear();
        var user = await db.Users.SingleAsync(u => u.Name == "old-image");
        Assert.Equal(0, user.FailedSignInCount);
        Assert.Null(user.LockedUntil);
        Assert.Equal(CalendarEntity.Weekdays, (await db.Calendars.SingleAsync()).WorkingDays);
    }

    [PostgresFact]
    public async Task ConcurrentWrongPasswords_UseTheLatestCountAndLockOnTheTenth()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await SeedLoginUserAsync(database, failedCount: 8);
        await using var firstDb = database.CreateContext();
        await using var secondDb = database.CreateContext();
        // A tracked entity must be refreshed after the second request gets the lock.
        await secondDb.Users.SingleAsync();
        var paused = new PausedWrongPasswordHasher();
        var wrong = new LoginDto { Name = "lockout", Password = "wrong-password" };

        var first = Task.Run(() => CreateLoginService(firstDb, paused).LoginAsync(wrong));
        await paused.Entered.WaitAsync(TimeSpan.FromSeconds(10));
        var second = Task.Run(() => CreateLoginService(secondDb, new PasswordHasher<UserEntity>()).LoginAsync(wrong));
        await WaitForBlockedAccountLockAsync(database, second, paused);
        var firstResult = await first.WaitAsync(TimeSpan.FromSeconds(10));
        var secondResult = await second.WaitAsync(TimeSpan.FromSeconds(10));

        Assert.Equal("Invalid credentials", firstResult.Error);
        Assert.Equal("Invalid credentials", secondResult.Error);
        await using var check = database.CreateContext();
        var user = await check.Users.SingleAsync();
        Assert.Equal(0, user.FailedSignInCount);
        Assert.Equal(LockoutTime.UtcDateTime.AddMinutes(15), user.LockedUntil);
        Assert.Equal(1, await check.AuditLogs.CountAsync(a => a.Action == "SignInLocked"));
    }

    [PostgresFact]
    public async Task CorrectSignInAfterConcurrentWrongPassword_ClearsItsCount()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await SeedLoginUserAsync(database, failedCount: 8);
        await using var firstDb = database.CreateContext();
        await using var secondDb = database.CreateContext();
        var paused = new PausedWrongPasswordHasher();

        var first = Task.Run(() => CreateLoginService(firstDb, paused).LoginAsync(new LoginDto { Name = "lockout", Password = "wrong-password" }));
        await paused.Entered.WaitAsync(TimeSpan.FromSeconds(10));
        var second = Task.Run(() => CreateLoginService(secondDb, new PasswordHasher<UserEntity>())
            .LoginAsync(new LoginDto { Name = "lockout", Password = TestPassword }));
        await WaitForBlockedAccountLockAsync(database, second, paused);
        await first.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.True((await second.WaitAsync(TimeSpan.FromSeconds(10))).IsSuccess);

        await using var check = database.CreateContext();
        var user = await check.Users.SingleAsync();
        Assert.Equal(0, user.FailedSignInCount);
        Assert.Null(user.LockedUntil);
    }

    [PostgresFact]
    public async Task AdminResetAfterConcurrentWrongPassword_LiftsItsLock()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        var userId = await SeedLoginUserAsync(database, failedCount: 9);
        await using var firstDb = database.CreateContext();
        await using var resetDb = database.CreateContext();
        var paused = new PausedWrongPasswordHasher();
        var admin = new Mock<ICurrentUserService>();
        admin.Setup(x => x.IsInRole(UserRole.Admin)).Returns(true);
        var reset = new ResetPasswordService(resetDb, admin.Object, new AuditLogService(resetDb, admin.Object),
            new SecurityStampCache(new MemoryCache(new MemoryCacheOptions())), new PasswordHasher<UserEntity>());

        var first = Task.Run(() => CreateLoginService(firstDb, paused).LoginAsync(new LoginDto { Name = "lockout", Password = "wrong-password" }));
        await paused.Entered.WaitAsync(TimeSpan.FromSeconds(10));
        var second = Task.Run(() => reset.ResetPasswordAsync(new ResetPasswordDto { UserId = userId, NewPassword = "replacement-password" }));
        await WaitForBlockedAccountLockAsync(database, second, paused);
        Assert.Equal("Invalid credentials", (await first.WaitAsync(TimeSpan.FromSeconds(10))).Error);
        Assert.True((await second.WaitAsync(TimeSpan.FromSeconds(10))).IsSuccess);

        await using var check = database.CreateContext();
        var user = await check.Users.SingleAsync();
        Assert.Equal(0, user.FailedSignInCount);
        Assert.Null(user.LockedUntil);
        Assert.Equal(PasswordVerificationResult.Success,
            new PasswordHasher<UserEntity>().VerifyHashedPassword(user, user.PasswordHash, "replacement-password"));
    }

    // With real foreign keys: a role change no longer files a new doctor under
    // a department that may not exist.
    [PostgresFact]
    public async Task MakingADoctor_NeedsADepartmentThatExists()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = await database.CreateMigratedContextAsync();
        var user = new UserEntity { Name = "newdoc", PasswordHash = "x", Role = UserRole.Pending };
        var department = new DepartmentEntity { Name = "Neurology", IsActive = true };
        db.AddRange(user, department);
        await db.SaveChangesAsync();
        var admin = new Mock<ICurrentUserService>();
        admin.Setup(x => x.IsInRole(UserRole.Admin)).Returns(true);
        admin.Setup(x => x.UserId).Returns("0");
        var service = new ChangeRoleService(db, admin.Object, new AuditLogService(db, admin.Object),
            new SecurityStampCache(new MemoryCache(new MemoryCacheOptions())));

        var missing = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = user.Id, NewRole = UserRole.Doctor, DepartmentId = department.Id + 100 });
        var made = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = user.Id, NewRole = UserRole.Doctor, DepartmentId = department.Id });

        Assert.Equal(FailureKind.NotFound, missing.Failure);
        Assert.True(made.IsSuccess, made.Error);
        Assert.Equal(department.Id, (await db.Doctors.SingleAsync()).DepartmentId);
    }
}

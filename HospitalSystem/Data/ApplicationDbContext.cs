using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
        // Inside a transaction a service started, EF would set a savepoint
        // before every SaveChanges and release it after: two extra round trips
        // per save. A savepoint only helps code that keeps using a transaction
        // after a failed save, and no service does; a failed save ends the
        // request and the whole transaction rolls back.
        Database.AutoSavepointsEnabled = false;
    }
    public DbSet<UserEntity> Users { get; set; }
    public DbSet<AppointmentEntity> Appointments { get; set; }
    public DbSet<DepartmentEntity> Departments { get; set; }
    public DbSet<DoctorEntity> Doctors { get; set; }
    public DbSet<PatientEntity> Patients { get; set; }
    public DbSet<CalendarEntity> Calendars { get; set; }
    public DbSet<AuditLogEntity> AuditLogs { get; set; }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<UserEntity>(builder =>
        {
            builder.Property(s => s.PasswordHash).IsRequired().HasMaxLength(256);
            builder.Property(s => s.Role).IsRequired().HasConversion<string>();
            builder.Property(s => s.Name).IsRequired().HasMaxLength(50);
            builder.Property(s => s.SecurityStamp).IsRequired().HasMaxLength(64);
            // Usernames are unique ignoring case, through the unique index
            // IX_Users_LowerName on lower("Name") that migration
            // CaseInsensitiveUserNames creates in SQL: EF cannot describe an
            // index on an expression.
        });

        modelBuilder.Entity<PatientEntity>(builder =>
        {
            builder.Property(s => s.PhoneNumber).IsRequired().HasMaxLength(20);
            builder.Property(s => s.Name).IsRequired().HasMaxLength(50);
            builder.Property(s => s.DateOfBirth).IsRequired();
            // Not unique: relatives often share a phone. Booking looks patients
            // up by phone number, or by name and date of birth. The second
            // lookup ignores case and uses IX_Patients_LowerName_DateOfBirth
            // on (lower("Name"), "DateOfBirth"), which migration
            // IndexPatientsByNameAndBirthDate creates in SQL: EF cannot
            // describe an index on an expression.
            builder.HasIndex(s => s.PhoneNumber);
        });

        modelBuilder.Entity<DepartmentEntity>(builder =>
        {
            // The column keeps its first name, "Department", which older
            // releases still read and write.
            builder.Property(s => s.Name).HasColumnName("Department").IsRequired().HasMaxLength(100);
            // Names are unique ignoring case, through the unique index
            // IX_Departments_LowerDepartment on lower("Department") that
            // migration CaseInsensitiveDepartmentNames creates in SQL.
        });

        modelBuilder.Entity<DoctorEntity>(builder =>
        {
            builder.HasOne(d => d.User).WithOne(u => u.Doctor).HasForeignKey<DoctorEntity>(d => d.UserId).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(d => d.Department).WithMany(u => u.Doctors).HasForeignKey("DepartmentId").OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AppointmentEntity>(builder =>
        {
            builder.HasOne(d => d.CreatedByTheFrontDesk).WithMany(u => u.CreatedAppointments).HasForeignKey("CreatedByTheFrontDeskId").OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(d => d.Patient).WithMany(u => u.Appointments).HasForeignKey("PatientId").OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(d => d.Doctor).WithMany(s => s.Appointments).HasForeignKey("DoctorId").OnDelete(DeleteBehavior.Restrict);
            builder.Property(s => s.Status).HasConversion<string>();
            builder.Property(a => a.CancellationReason).HasMaxLength(500).IsRequired(false);
            builder.Property(a => a.CancelledAt).IsRequired(false);
            // No two scheduled appointments for a doctor at one time. Booking
            // also reads the nearest scheduled appointments from it.
            builder.HasIndex(a => new { a.DoctorId, a.TimeOfAppointment })
                .IsUnique()
                .HasFilter("\"Status\" = 'Scheduled'");
            // One doctor's appointments in a time range, in every status.
            builder.HasIndex(a => new { a.DoctorId, a.TimeOfAppointment }, "IX_Appointments_DoctorId_TimeOfAppointment_AllStatuses");
        });

        modelBuilder.Entity<CalendarEntity>(builder =>
        {
            builder.HasOne(c => c.Doctor).WithMany(d => d.Calendars).HasForeignKey(c => c.DoctorId).OnDelete(DeleteBehavior.Restrict);
            // One schedule per doctor. Booking reads the doctor's schedule from it.
            builder.HasIndex(c => c.DoctorId).IsUnique();
        });

        modelBuilder.Entity<AuditLogEntity>(builder =>
        {
            builder.Property(a => a.Action).IsRequired().HasMaxLength(80);
            builder.Property(a => a.EntityType).IsRequired().HasMaxLength(80);
            builder.Property(a => a.Details).IsRequired().HasMaxLength(1000);
            builder.Property(a => a.ActorName).IsRequired().HasMaxLength(80);
            builder.HasIndex(a => new { a.EntityType, a.EntityId, a.CreatedAt });
            // The audit screen pages through entries newest first.
            builder.HasIndex(a => new { a.CreatedAt, a.Id });
        });

    }
}

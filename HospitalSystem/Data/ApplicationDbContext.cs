using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
        Database.AutoSavepointsEnabled = false;
    }
    public DbSet<UserEntity> Users { get; set; }
    public DbSet<AppointmentEntity> Appointments { get; set; }
    public DbSet<DepartmentEntity> Departments { get; set; }
    public DbSet<DoctorEntity> Doctors { get; set; }
    public DbSet<PatientEntity> Patients { get; set; }
    public DbSet<CalendarEntity> Calendars { get; set; }
    public DbSet<TimeOffEntity> TimeOff { get; set; }
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
        });

        modelBuilder.Entity<PatientEntity>(builder =>
        {
            builder.Property(s => s.PhoneNumber).IsRequired().HasMaxLength(20);
            builder.Property(s => s.Name).IsRequired().HasMaxLength(50);
            builder.Property(s => s.DateOfBirth).IsRequired();
            builder.HasIndex(s => s.PhoneNumber);
            builder.HasIndex(s => new { s.Name, s.Id });
        });

        modelBuilder.Entity<DepartmentEntity>(builder =>
        {
            builder.Property(s => s.Name).HasColumnName("Department").IsRequired().HasMaxLength(100);
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
            builder.HasIndex(a => new { a.DoctorId, a.TimeOfAppointment })
                .IsUnique()
                .HasFilter("\"Status\" = 'Scheduled'");
            builder.HasIndex(a => new { a.DoctorId, a.TimeOfAppointment }, "IX_Appointments_DoctorId_TimeOfAppointment_AllStatuses");
        });

        modelBuilder.Entity<CalendarEntity>(builder =>
        {
            builder.HasOne(c => c.Doctor).WithMany(d => d.Calendars).HasForeignKey(c => c.DoctorId).OnDelete(DeleteBehavior.Restrict);
            builder.HasIndex(c => c.DoctorId).IsUnique();
        });

        modelBuilder.Entity<TimeOffEntity>(builder =>
        {
            builder.HasOne(t => t.Calendar).WithMany(c => c.TimeOff).HasForeignKey(t => t.CalendarId).OnDelete(DeleteBehavior.Restrict);
            builder.Property(t => t.Reason).HasMaxLength(200);
            builder.HasIndex(t => new { t.CalendarId, t.LastDay });
        });

        modelBuilder.Entity<AuditLogEntity>(builder =>
        {
            builder.Property(a => a.Action).IsRequired().HasMaxLength(80);
            builder.Property(a => a.EntityType).IsRequired().HasMaxLength(80);
            builder.Property(a => a.Details).IsRequired().HasMaxLength(1000);
            builder.Property(a => a.ActorName).IsRequired().HasMaxLength(80);
            builder.HasIndex(a => new { a.EntityType, a.EntityId, a.CreatedAt });
            builder.HasIndex(a => new { a.CreatedAt, a.Id });
        });

    }
}

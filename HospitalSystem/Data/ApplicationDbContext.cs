using Microsoft.EntityFrameworkCore;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }
    public DbSet<UserEntity> Users { get; set; }
    public DbSet<AppointmentsEntity> Appointments { get; set; }
    public DbSet<DepartmentEntity> Departments { get; set; }
    public DbSet<DoctorEntity> Doctors { get; set; }
    public DbSet<PatientEntity> Patients { get; set; }
    // public DbSet<RoleEntity> Roles { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<UserEntity>(builder =>
        {
            builder.Property(s=> s.PasswordHash).IsRequired().HasMaxLength(50);
            builder.Property(s=>s.Role).IsRequired().HasConversion<string>();
        });

        modelBuilder.Entity<AppointmentsEntity>(builder =>
        {
           builder.Property(s => s.Status).HasConversion<string>().HasDefaultValue(AppointmentStatus.Pending); 
        });
    }
}
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
            builder.Property(s => s.PasswordHash).IsRequired().HasMaxLength(256);
            builder.Property(s => s.Role).IsRequired().HasConversion<string>();
            builder.Property(s => s.Name).IsRequired().HasMaxLength(50);
            builder.HasIndex(s => s.Name).IsUnique();


        });

        modelBuilder.Entity<PatientEntity>(builder =>
        {
           builder.Property(s => s.PhoneNumber).IsRequired().HasMaxLength(20);
           builder.Property(s=>s.Name).IsRequired().HasMaxLength(50); 
           builder.Property(s=>s.DateOfBirth).IsRequired(); 

        });

        modelBuilder.Entity<DepartmentEntity>(builder =>
        {
           builder.Property(s => s.Department).IsRequired(); 
           builder.HasIndex(s=> s.Department).IsUnique();
        });

        modelBuilder.Entity<DoctorEntity>(builder =>
        {
            builder.HasOne(d => d.User).WithOne(u => u.Doctor).HasForeignKey<DoctorEntity>(d => d.UserId).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(d => d.Department).WithMany(u => u.Doctors).HasForeignKey("DepartmentId") .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AppointmentsEntity>(builder =>
        {
           builder.HasOne(d => d.CreatedByTheFrontDesk).WithMany(u => u.CreatedAppointments).HasForeignKey("CreatedByTheFrontDeskId").OnDelete(DeleteBehavior.Restrict);
           builder.HasOne(d => d.Patient).WithMany(u => u.Appointments).HasForeignKey("PatientId").OnDelete(DeleteBehavior.Restrict);
           builder.HasOne(d => d.Doctor).WithMany(s => s.Appointments).HasForeignKey("DoctorId").OnDelete(DeleteBehavior.Restrict);
           builder.Property(s => s.Status).HasConversion<string>();
           builder.Property(s => s.CancellationReason).IsRequired();
        });

    
    }
}
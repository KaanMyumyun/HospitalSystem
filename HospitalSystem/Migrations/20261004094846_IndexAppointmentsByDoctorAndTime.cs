using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class IndexAppointmentsByDoctorAndTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Appointments_DoctorId_TimeOfAppointment_AllStatuses",
                table: "Appointments",
                columns: new[] { "DoctorId", "TimeOfAppointment" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Appointments_DoctorId_TimeOfAppointment_AllStatuses",
                table: "Appointments");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddCalendarScheduleSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CalendarEntity_Doctors_DoctorId",
                table: "CalendarEntity");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CalendarEntity",
                table: "CalendarEntity");

            migrationBuilder.RenameTable(
                name: "CalendarEntity",
                newName: "Calendars");

            migrationBuilder.RenameIndex(
                name: "IX_CalendarEntity_DoctorId",
                table: "Calendars",
                newName: "IX_Calendars_DoctorId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Calendars",
                table: "Calendars",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Calendars_Doctors_DoctorId",
                table: "Calendars",
                column: "DoctorId",
                principalTable: "Doctors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Calendars_Doctors_DoctorId",
                table: "Calendars");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Calendars",
                table: "Calendars");

            migrationBuilder.RenameTable(
                name: "Calendars",
                newName: "CalendarEntity");

            migrationBuilder.RenameIndex(
                name: "IX_Calendars_DoctorId",
                table: "CalendarEntity",
                newName: "IX_CalendarEntity_DoctorId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CalendarEntity",
                table: "CalendarEntity",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CalendarEntity_Doctors_DoctorId",
                table: "CalendarEntity",
                column: "DoctorId",
                principalTable: "Doctors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}

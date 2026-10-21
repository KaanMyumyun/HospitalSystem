using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduleWorkingDays : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Existing schedules get Monday to Friday (DayOfWeek 1 to 5): the
            // days the reception grid showed before working days existed. The
            // default stays, so an older image, which does not write the
            // column, can still create schedules during a deploy or after a
            // rollback. This API always writes the days.
            migrationBuilder.AddColumn<int[]>(
                name: "WorkingDays",
                table: "Calendars",
                type: "integer[]",
                nullable: false,
                defaultValue: new[] { 1, 2, 3, 4, 5 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WorkingDays",
                table: "Calendars");
        }
    }
}

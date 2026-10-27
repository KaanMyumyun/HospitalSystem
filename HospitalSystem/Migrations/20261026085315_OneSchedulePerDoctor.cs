using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class OneSchedulePerDoctor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // A doctor has one schedule: creating one is refused while the
            // doctor has another, and booking reads the doctor's only one.
            // A doctor who already has two has to keep one by hand first; the
            // migration stops rather than pick which.
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM "Calendars" GROUP BY "DoctorId" HAVING count(*) > 1) THEN
                        RAISE EXCEPTION 'Some doctors have more than one schedule. Delete all but one for each, then apply this migration again.';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropIndex(
                name: "IX_Calendars_DoctorId",
                table: "Calendars");

            migrationBuilder.CreateIndex(
                name: "IX_Calendars_DoctorId",
                table: "Calendars",
                column: "DoctorId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Calendars_DoctorId",
                table: "Calendars");

            migrationBuilder.CreateIndex(
                name: "IX_Calendars_DoctorId",
                table: "Calendars",
                column: "DoctorId");
        }
    }
}

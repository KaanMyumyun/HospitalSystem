using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class StoreDateOfBirthAsDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The frontend used to send a date of birth as the browser's local
            // midnight converted to UTC, so browsers east of UTC stored the day
            // before (midnight in UTC+3 is 21:00 UTC the previous day). The UTC
            // time of day shows which side of UTC the browser was on:
            //   12:00-23:59  east of UTC, the real date is the next day
            //   00:00-11:59  UTC or west of it, the date is already right
            // Only browsers at UTC+12:45, +13, +14 or -12 are read wrongly.
            migrationBuilder.Sql("""
                ALTER TABLE "Patients"
                ALTER COLUMN "DateOfBirth" TYPE date
                USING CASE
                    WHEN ("DateOfBirth" AT TIME ZONE 'UTC')::time >= time '12:00'
                        THEN ("DateOfBirth" AT TIME ZONE 'UTC')::date + 1
                    ELSE ("DateOfBirth" AT TIME ZONE 'UTC')::date
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Dates come back as midnight UTC; the original times of day are gone.
            migrationBuilder.Sql("""
                ALTER TABLE "Patients"
                ALTER COLUMN "DateOfBirth" TYPE timestamp with time zone
                USING "DateOfBirth"::timestamp AT TIME ZONE 'UTC';
                """);
        }
    }
}

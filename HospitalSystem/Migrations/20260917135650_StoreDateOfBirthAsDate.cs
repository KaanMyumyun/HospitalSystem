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
            migrationBuilder.Sql("""
                ALTER TABLE "Patients"
                ALTER COLUMN "DateOfBirth" TYPE timestamp with time zone
                USING "DateOfBirth"::timestamp AT TIME ZONE 'UTC';
                """);
        }
    }
}

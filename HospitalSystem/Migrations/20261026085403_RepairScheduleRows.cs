using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class RepairScheduleRows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "Calendars"
                SET "StartTime" = TIMESTAMPTZ '2000-01-01 00:00:00+00'
                        + make_interval(secs => extract(epoch FROM "StartTime" - date_trunc('day', "StartTime", 'UTC'))),
                    "EndTime" = TIMESTAMPTZ '2000-01-01 00:00:00+00'
                        + make_interval(secs => extract(epoch FROM "EndTime" - date_trunc('day', "StartTime", 'UTC')))
                WHERE date_trunc('day', "StartTime", 'UTC') <> TIMESTAMPTZ '2000-01-01 00:00:00+00';

                UPDATE "Calendars" SET "SlotDurationMin" = 30 WHERE "SlotDurationMin" <= 0;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}

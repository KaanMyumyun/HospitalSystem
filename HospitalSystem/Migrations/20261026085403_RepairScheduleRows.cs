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
            // Working hours are times of day on 2000-01-01, the date new
            // schedules always used (CalendarEntity.HoursDate). Changing a
            // schedule used to store it on the day of the change instead; move
            // those to 2000-01-01 with the same times of day. An end at
            // midnight stays at the start of the next day. Seconds, not a day
            // interval, so the session's time zone cannot shift the result.
            //
            // Schedules from before slot lengths existed got 0, which the
            // reception calendar shows as 30-minute slots; give them that.
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
            // Nothing to undo: every release reads the times of day the same
            // way, whatever the date, and none needs a slot length of 0.
        }
    }
}

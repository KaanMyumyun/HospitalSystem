using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddBreaksAndTimeOff : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BreakEndMinute",
                table: "Calendars",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BreakStartMinute",
                table: "Calendars",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TimeOff",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CalendarId = table.Column<int>(type: "integer", nullable: false),
                    FirstDay = table.Column<DateOnly>(type: "date", nullable: false),
                    LastDay = table.Column<DateOnly>(type: "date", nullable: false),
                    Reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimeOff", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimeOff_Calendars_CalendarId",
                        column: x => x.CalendarId,
                        principalTable: "Calendars",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimeOff_CalendarId_LastDay",
                table: "TimeOff",
                columns: new[] { "CalendarId", "LastDay" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TimeOff");

            migrationBuilder.DropColumn(
                name: "BreakEndMinute",
                table: "Calendars");

            migrationBuilder.DropColumn(
                name: "BreakStartMinute",
                table: "Calendars");
        }
    }
}

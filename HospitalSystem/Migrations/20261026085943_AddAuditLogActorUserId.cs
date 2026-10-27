using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLogActorUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ActorUserId",
                table: "AuditLogs",
                type: "integer",
                nullable: true);

            // ActorName held the acting user's id. It now holds their
            // username, and ActorUserId the id. "Unknown" and ids of no user
            // stay as they are. Compared as text, so a value that is not a
            // number cannot fail a cast.
            migrationBuilder.Sql("""
                UPDATE "AuditLogs" AS a
                SET "ActorUserId" = u."Id", "ActorName" = u."Name"
                FROM "Users" AS u
                WHERE u."Id"::text = a."ActorName";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // ActorName keeps the usernames: every release shows a name it
            // cannot resolve as an id as it is.
            migrationBuilder.DropColumn(
                name: "ActorUserId",
                table: "AuditLogs");
        }
    }
}

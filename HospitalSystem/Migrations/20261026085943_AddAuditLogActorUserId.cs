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
            migrationBuilder.DropColumn(
                name: "ActorUserId",
                table: "AuditLogs");
        }
    }
}

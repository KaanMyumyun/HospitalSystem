using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class NameRemainingAuditLogActors : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "AuditLogs" AS a
                SET "ActorUserId" = u."Id", "ActorName" = u."Name"
                FROM "Users" AS u
                WHERE a."ActorUserId" IS NULL AND u."Id"::text = a."ActorName";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}

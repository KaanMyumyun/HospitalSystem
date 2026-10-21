using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class CaseInsensitiveUserNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Sign-in and user creation compare usernames ignoring case, so
            // "Admin" and "admin" must not both exist. Users that already
            // differ only in case have to be renamed by hand first; the
            // migration stops rather than pick one. EF cannot describe an
            // index on an expression, so it is created here in SQL and the
            // model snapshot does not list it.
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM "Users" GROUP BY lower("Name") HAVING count(*) > 1) THEN
                        RAISE EXCEPTION 'Some usernames differ only in case. Rename them, then apply this migration again.';
                    END IF;
                END $$;
                CREATE UNIQUE INDEX "IX_Users_LowerName" ON "Users" (lower("Name"));
                """);

            migrationBuilder.DropIndex(
                name: "IX_Users_Name",
                table: "Users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Users_Name",
                table: "Users",
                column: "Name",
                unique: true);

            migrationBuilder.Sql("""
                DROP INDEX "IX_Users_LowerName";
                """);
        }
    }
}

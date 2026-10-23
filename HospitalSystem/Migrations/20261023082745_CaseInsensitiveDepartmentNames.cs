using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class CaseInsensitiveDepartmentNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Creating a department compares names ignoring case, so
            // "Cardiology" and "cardiology" must not both exist. Departments
            // that already differ only in case have to be renamed by hand
            // first; the migration stops rather than pick one. EF cannot
            // describe an index on an expression, so it is created here in SQL
            // and the model snapshot does not list it.
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM "Departments" GROUP BY lower("Department") HAVING count(*) > 1) THEN
                        RAISE EXCEPTION 'Some department names differ only in case. Rename them, then apply this migration again.';
                    END IF;
                END $$;
                CREATE UNIQUE INDEX "IX_Departments_LowerDepartment" ON "Departments" (lower("Department"));
                """);

            migrationBuilder.DropIndex(
                name: "IX_Departments_Department",
                table: "Departments");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Departments_Department",
                table: "Departments",
                column: "Department",
                unique: true);

            migrationBuilder.Sql("""
                DROP INDEX "IX_Departments_LowerDepartment";
                """);
        }
    }
}

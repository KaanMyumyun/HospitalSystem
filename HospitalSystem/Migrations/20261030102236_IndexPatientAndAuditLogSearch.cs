using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class IndexPatientAndAuditLogSearch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Patients_Name_Id",
                table: "Patients",
                columns: new[] { "Name", "Id" });

            migrationBuilder.Sql("""
                CREATE EXTENSION IF NOT EXISTS pg_trgm;

                CREATE INDEX "IX_Patients_LowerName_Trgm"
                    ON "Patients" USING gin (lower("Name") gin_trgm_ops);

                CREATE INDEX "IX_Patients_PhoneNumber_Trgm"
                    ON "Patients" USING gin ("PhoneNumber" gin_trgm_ops);

                CREATE INDEX "IX_AuditLogs_LowerAction_Trgm"
                    ON "AuditLogs" USING gin (lower("Action") gin_trgm_ops);

                CREATE INDEX "IX_AuditLogs_LowerDetails_Trgm"
                    ON "AuditLogs" USING gin (lower("Details") gin_trgm_ops);

                ANALYZE "Patients", "AuditLogs";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP INDEX "IX_AuditLogs_LowerDetails_Trgm";
                DROP INDEX "IX_AuditLogs_LowerAction_Trgm";
                DROP INDEX "IX_Patients_PhoneNumber_Trgm";
                DROP INDEX "IX_Patients_LowerName_Trgm";
                """);

            migrationBuilder.DropIndex(
                name: "IX_Patients_Name_Id",
                table: "Patients");
        }
    }
}

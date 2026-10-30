using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class IndexPatientsByNameAndBirthDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE INDEX "IX_Patients_LowerName_DateOfBirth"
                    ON "Patients" (lower("Name"), "DateOfBirth");
                """);

            migrationBuilder.DropIndex(
                name: "IX_Patients_DateOfBirth",
                table: "Patients");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Patients_DateOfBirth",
                table: "Patients",
                column: "DateOfBirth");

            migrationBuilder.Sql("""
                DROP INDEX "IX_Patients_LowerName_DateOfBirth";
                """);
        }
    }
}

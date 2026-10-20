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
            // Booking matches patients on name, ignoring case, and date of
            // birth. An index on the date alone leaves every patient born that
            // day to be read and compared; this one finds the match directly.
            // EF cannot describe an index on an expression, so it is created
            // here in SQL and the model snapshot does not list it.
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

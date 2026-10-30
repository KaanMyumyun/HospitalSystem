using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalSystem.Migrations
{
    /// <inheritdoc />
    public partial class AllowSharedPatientPhoneNumbers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_PhoneNumber",
                table: "Patients");

            migrationBuilder.Sql("""
                UPDATE "Patients"
                SET "PhoneNumber" =
                    CASE WHEN "PhoneNumber" ~ '^\s*\+' THEN '+' ELSE '' END
                    || regexp_replace("PhoneNumber", '[^0-9]', '', 'g')
                WHERE "PhoneNumber" !~ '^\+?[0-9]*$';
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_DateOfBirth",
                table: "Patients",
                column: "DateOfBirth");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_PhoneNumber",
                table: "Patients",
                column: "PhoneNumber");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_DateOfBirth",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_PhoneNumber",
                table: "Patients");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_PhoneNumber",
                table: "Patients",
                column: "PhoneNumber",
                unique: true);
        }
    }
}

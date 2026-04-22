using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BioField.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemovePasswordAddGoogleId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PasswordHash",
                table: "Users",
                newName: "GoogleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "GoogleId",
                table: "Users",
                newName: "PasswordHash");
        }
    }
}

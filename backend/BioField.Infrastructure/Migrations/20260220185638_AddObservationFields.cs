using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BioField.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddObservationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Observations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Humidity",
                table: "Observations",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TagsJson",
                table: "Observations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Temperature",
                table: "Observations",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Observations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WeatherCondition",
                table: "Observations",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "Observations");

            migrationBuilder.DropColumn(
                name: "Humidity",
                table: "Observations");

            migrationBuilder.DropColumn(
                name: "TagsJson",
                table: "Observations");

            migrationBuilder.DropColumn(
                name: "Temperature",
                table: "Observations");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "Observations");

            migrationBuilder.DropColumn(
                name: "WeatherCondition",
                table: "Observations");
        }
    }
}

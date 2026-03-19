using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeekStore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStockCount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "StockCount",
                table: "Products",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StockCount",
                table: "Products");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GoblinSpot.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGoblinFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TwoFactorBackupCodes",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TwoFactorEnabled",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TwoFactorSecret",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ListingType",
                table: "Products",
                type: "text",
                nullable: false,
                defaultValue: "");

// migrationBuilder.AddColumn<string>(
//     name: "SellerNote",
//     table: "Products",
//     type: "text",
//     nullable: false,
//     defaultValue: "");

// migrationBuilder.AddColumn<DateTime>(
//     name: "ResolvedAt",
//     table: "Disputes",
//     type: "timestamp with time zone",
//     nullable: true);

// Tables ProductReports, Refunds, and UserBlocks already exist and their indexes are skipped in this migration.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
// migrationBuilder.DropTable(
//     name: "ProductReports");

// migrationBuilder.DropTable(
//     name: "Refunds");

// migrationBuilder.DropTable(
//     name: "UserBlocks");

            migrationBuilder.DropColumn(
                name: "TwoFactorBackupCodes",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TwoFactorEnabled",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TwoFactorSecret",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ListingType",
                table: "Products");

// migrationBuilder.DropColumn(
//     name: "SellerNote",
//     table: "Products");

// migrationBuilder.DropColumn(
//     name: "ResolvedAt",
//     table: "Disputes");
        }
    }
}

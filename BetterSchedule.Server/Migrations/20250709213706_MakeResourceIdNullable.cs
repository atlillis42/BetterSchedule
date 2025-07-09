using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BetterSchedule.Server.Migrations
{
    /// <inheritdoc />
    public partial class MakeResourceIdNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CalendarEvents_CalendarResources_ResourceId",
                schema: "identity",
                table: "CalendarEvents");

            migrationBuilder.AlterColumn<int>(
                name: "ResourceId",
                schema: "identity",
                table: "CalendarEvents",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddForeignKey(
                name: "FK_CalendarEvents_CalendarResources_ResourceId",
                schema: "identity",
                table: "CalendarEvents",
                column: "ResourceId",
                principalSchema: "identity",
                principalTable: "CalendarResources",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CalendarEvents_CalendarResources_ResourceId",
                schema: "identity",
                table: "CalendarEvents");

            migrationBuilder.AlterColumn<int>(
                name: "ResourceId",
                schema: "identity",
                table: "CalendarEvents",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_CalendarEvents_CalendarResources_ResourceId",
                schema: "identity",
                table: "CalendarEvents",
                column: "ResourceId",
                principalSchema: "identity",
                principalTable: "CalendarResources",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

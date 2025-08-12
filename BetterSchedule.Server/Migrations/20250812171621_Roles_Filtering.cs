using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BetterSchedule.Server.Migrations
{
    /// <inheritdoc />
    public partial class Roles_Filtering : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Reservations_OrganizationId",
                table: "Reservations");

            migrationBuilder.DropIndex(
                name: "IX_BlockedTimes_OrganizationId",
                table: "BlockedTimes");

            migrationBuilder.AddColumn<string>(
                name: "CreatedByUserId",
                table: "BlockedTimes",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_OrganizationId_ServiceProviderId_StartTime_EndTime",
                table: "Reservations",
                columns: new[] { "OrganizationId", "ServiceProviderId", "StartTime", "EndTime" });

            migrationBuilder.CreateIndex(
                name: "IX_BlockedTimes_CreatedByUserId",
                table: "BlockedTimes",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BlockedTimes_OrganizationId_CreatedByUserId",
                table: "BlockedTimes",
                columns: new[] { "OrganizationId", "CreatedByUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_BlockedTimes_OrganizationId_ResourceId_StartTime_EndTime",
                table: "BlockedTimes",
                columns: new[] { "OrganizationId", "ResourceId", "StartTime", "EndTime" });

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentTypes_OrganizationId_CreatedByUserId",
                table: "AppointmentTypes",
                columns: new[] { "OrganizationId", "CreatedByUserId" });

            migrationBuilder.AddForeignKey(
                name: "FK_BlockedTimes_AspNetUsers_CreatedByUserId",
                table: "BlockedTimes",
                column: "CreatedByUserId",
                principalSchema: "identity",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BlockedTimes_AspNetUsers_CreatedByUserId",
                table: "BlockedTimes");

            migrationBuilder.DropIndex(
                name: "IX_Reservations_OrganizationId_ServiceProviderId_StartTime_EndTime",
                table: "Reservations");

            migrationBuilder.DropIndex(
                name: "IX_BlockedTimes_CreatedByUserId",
                table: "BlockedTimes");

            migrationBuilder.DropIndex(
                name: "IX_BlockedTimes_OrganizationId_CreatedByUserId",
                table: "BlockedTimes");

            migrationBuilder.DropIndex(
                name: "IX_BlockedTimes_OrganizationId_ResourceId_StartTime_EndTime",
                table: "BlockedTimes");

            migrationBuilder.DropIndex(
                name: "IX_AppointmentTypes_OrganizationId_CreatedByUserId",
                table: "AppointmentTypes");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "BlockedTimes");

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_OrganizationId",
                table: "Reservations",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_BlockedTimes_OrganizationId",
                table: "BlockedTimes",
                column: "OrganizationId");
        }
    }
}

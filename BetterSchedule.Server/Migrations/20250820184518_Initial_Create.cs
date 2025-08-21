using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BetterSchedule.Server.Migrations
{
    /// <inheritdoc />
    public partial class Initial_Create : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "identity");

            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                schema: "identity",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Organizations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    OwnerUserId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BookingLeadTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    CancellationWindow = table.Column<TimeSpan>(type: "time", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Organizations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                schema: "identity",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalSchema: "identity",
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                schema: "identity",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    OrganizationId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CalendarResources",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    BackColor = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OrganizationId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CalendarResources", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CalendarResources_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrganizationSettings",
                columns: table => new
                {
                    OrganizationId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    MinLeadMinutes = table.Column<int>(type: "int", nullable: false),
                    CancelWindowHours = table.Column<int>(type: "int", nullable: false),
                    ShowWeekends = table.Column<bool>(type: "bit", nullable: false),
                    StartOfWeek = table.Column<int>(type: "int", nullable: false),
                    BusinessHoursStartLocal = table.Column<TimeSpan>(type: "time", nullable: false),
                    BusinessHoursEndLocal = table.Column<TimeSpan>(type: "time", nullable: false),
                    DefaultView = table.Column<int>(type: "int", nullable: false),
                    ShadingMode = table.Column<int>(type: "int", nullable: false),
                    AvailabilityEnforcement = table.Column<int>(type: "int", nullable: false),
                    RequireConfirmOnOverrides = table.Column<bool>(type: "bit", nullable: false),
                    AvailabilityPublic = table.Column<bool>(type: "bit", nullable: false),
                    ProvidersCanEditOwnAvailability = table.Column<bool>(type: "bit", nullable: false),
                    TimeZoneId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Locale = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    EmailEnabled = table.Column<bool>(type: "bit", nullable: false),
                    SmsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    SendBookingConfirmation = table.Column<bool>(type: "bit", nullable: false),
                    ReminderHoursBefore = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationSettings", x => x.OrganizationId);
                    table.ForeignKey(
                        name: "FK_OrganizationSettings_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                schema: "identity",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "identity",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                schema: "identity",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "identity",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                schema: "identity",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalSchema: "identity",
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "identity",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                schema: "identity",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "identity",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ClientOrganizations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    OrganizationId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientOrganizations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientOrganizations_AspNetUsers_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "identity",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClientOrganizations_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProviderAvailabilities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrganizationId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ServiceProviderId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    DayOfWeek = table.Column<int>(type: "int", nullable: false),
                    StartLocalTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    EndLocalTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    EffectiveTo = table.Column<DateOnly>(type: "date", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderAvailabilities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderAvailabilities_AspNetUsers_ServiceProviderId",
                        column: x => x.ServiceProviderId,
                        principalSchema: "identity",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProviderAvailabilities_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AppointmentTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Duration = table.Column<TimeSpan>(type: "time", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AssignedResourceId = table.Column<int>(type: "int", nullable: true),
                    IsPublic = table.Column<bool>(type: "bit", nullable: false),
                    RequiresWaiver = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    OrganizationId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppointmentTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppointmentTypes_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalSchema: "identity",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AppointmentTypes_CalendarResources_AssignedResourceId",
                        column: x => x.AssignedResourceId,
                        principalTable: "CalendarResources",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AppointmentTypes_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BlockedTimes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    EndTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ResourceId = table.Column<int>(type: "int", nullable: true),
                    BackColor = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    OrganizationId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BlockedTimes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BlockedTimes_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalSchema: "identity",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BlockedTimes_CalendarResources_ResourceId",
                        column: x => x.ResourceId,
                        principalTable: "CalendarResources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BlockedTimes_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Reservations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ServiceProviderId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AppointmentTypeId = table.Column<int>(type: "int", nullable: false),
                    StartTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    EndTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ResourceId = table.Column<int>(type: "int", nullable: true),
                    PackageAssignmentId = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    OrganizationId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reservations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reservations_AppointmentTypes_AppointmentTypeId",
                        column: x => x.AppointmentTypeId,
                        principalTable: "AppointmentTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Reservations_AspNetUsers_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "identity",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Reservations_AspNetUsers_ServiceProviderId",
                        column: x => x.ServiceProviderId,
                        principalSchema: "identity",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Reservations_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReservationParticipants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReservationId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    GuestName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    GuestPhone = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Role = table.Column<int>(type: "int", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    OrganizationId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReservationParticipants", x => x.Id);
                    table.CheckConstraint("CK_ReservationParticipant_User_Guest_Role", "(([Role] = 2 AND [UserId] IS NULL) OR ([Role] IN (0,1) AND [UserId] IS NOT NULL))");
                    table.ForeignKey(
                        name: "FK_ReservationParticipants_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "identity",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ReservationParticipants_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReservationParticipants_Reservations_ReservationId",
                        column: x => x.ReservationId,
                        principalTable: "Reservations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentTypes_AssignedResourceId",
                table: "AppointmentTypes",
                column: "AssignedResourceId");

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentTypes_CreatedByUserId",
                table: "AppointmentTypes",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentTypes_OrganizationId_CreatedByUserId",
                table: "AppointmentTypes",
                columns: new[] { "OrganizationId", "CreatedByUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentTypes_OrganizationId_Name",
                table: "AppointmentTypes",
                columns: new[] { "OrganizationId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                schema: "identity",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                schema: "identity",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                schema: "identity",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                schema: "identity",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                schema: "identity",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                schema: "identity",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_OrganizationId",
                schema: "identity",
                table: "AspNetUsers",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                schema: "identity",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

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
                name: "IX_BlockedTimes_ResourceId",
                table: "BlockedTimes",
                column: "ResourceId");

            migrationBuilder.CreateIndex(
                name: "IX_CalendarResources_OrganizationId_Name",
                table: "CalendarResources",
                columns: new[] { "OrganizationId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClientOrganizations_ClientId_OrganizationId",
                table: "ClientOrganizations",
                columns: new[] { "ClientId", "OrganizationId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClientOrganizations_OrganizationId",
                table: "ClientOrganizations",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAvailabilities_OrganizationId_ServiceProviderId_DayOfWeek",
                table: "ProviderAvailabilities",
                columns: new[] { "OrganizationId", "ServiceProviderId", "DayOfWeek" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAvailabilities_OrganizationId_ServiceProviderId_DayOfWeek_EffectiveFrom_EffectiveTo_StartLocalTime_EndLocalTime",
                table: "ProviderAvailabilities",
                columns: new[] { "OrganizationId", "ServiceProviderId", "DayOfWeek", "EffectiveFrom", "EffectiveTo", "StartLocalTime", "EndLocalTime" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAvailabilities_ServiceProviderId",
                table: "ProviderAvailabilities",
                column: "ServiceProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationParticipants_OrganizationId",
                table: "ReservationParticipants",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationParticipants_ReservationId_UserId",
                table: "ReservationParticipants",
                columns: new[] { "ReservationId", "UserId" },
                unique: true,
                filter: "[IsDeleted] = 0 AND [UserId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationParticipants_UserId",
                table: "ReservationParticipants",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_AppointmentTypeId",
                table: "Reservations",
                column: "AppointmentTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_ClientId",
                table: "Reservations",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_OrganizationId_ServiceProviderId_StartTime_EndTime",
                table: "Reservations",
                columns: new[] { "OrganizationId", "ServiceProviderId", "StartTime", "EndTime" });

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_ServiceProviderId",
                table: "Reservations",
                column: "ServiceProviderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "BlockedTimes");

            migrationBuilder.DropTable(
                name: "ClientOrganizations");

            migrationBuilder.DropTable(
                name: "OrganizationSettings");

            migrationBuilder.DropTable(
                name: "ProviderAvailabilities");

            migrationBuilder.DropTable(
                name: "ReservationParticipants");

            migrationBuilder.DropTable(
                name: "AspNetRoles",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "Reservations");

            migrationBuilder.DropTable(
                name: "AppointmentTypes");

            migrationBuilder.DropTable(
                name: "AspNetUsers",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "CalendarResources");

            migrationBuilder.DropTable(
                name: "Organizations");
        }
    }
}

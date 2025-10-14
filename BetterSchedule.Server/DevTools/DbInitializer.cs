using System;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.Tenant;
using BetterSchedule.Server.Models.Tenant.SettingsHelpers;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.DevTools
{
    /// <summary>
    /// Seeds development/demo data for BetterSchedule.
    /// Produces two demo organizations with users, resources, appointment types,
    /// provider availability, reservations, and participants. IDs remain stable;
    /// names and data are human-readable for demos.
    /// </summary>
    public static class DbInitializer
    {
        /// <summary>
        /// Seeds development/demo data. Optional <paramref name="nowUtc"/> lets you fix the clock for deterministic seeding.
        /// </summary>
        public static async Task SeedAsync(
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            bool reset = false,
            DateTimeOffset? nowUtc = null)
        {
            var now = nowUtc ?? DateTimeOffset.UtcNow;

            // -----------------------------
            // Roles
            // -----------------------------
            var roles = new[] { "Manager", "ServiceProvider", "Client" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }

            // -----------------------------
            // Optional reset (domain data only)
            // -----------------------------
            if (reset)
            {
                db.ReservationParticipants.RemoveRange(db.ReservationParticipants);
                db.Reservations.RemoveRange(db.Reservations);
                db.BlockedTimes.RemoveRange(db.BlockedTimes);
                db.ProviderAvailabilities.RemoveRange(db.ProviderAvailabilities);
                db.AppointmentTypes.RemoveRange(db.AppointmentTypes);
                db.CalendarResources.RemoveRange(db.CalendarResources);
                db.OrganizationSettings.RemoveRange(db.OrganizationSettings);
                await db.SaveChangesAsync();
            }

            // -----------------------------
            // Organizations (stable IDs, clearer names)
            // -----------------------------
            var org1 = await EnsureOrganizationAsync(db, "demo-org-1", "First Demo Holistic Wellness");
            var org2 = await EnsureOrganizationAsync(db, "demo-org-2", "Demo Two, Health Strikes Back");

            // -----------------------------
            // Org Settings
            // -----------------------------
            await EnsureOrgSettingsAsync(
                db,
                org1.Id,
                minLeadMinutes: 60,
                cancelWindowHours: 24,
                showWeekends: true,
                startOfWeek: 0,
                businessStart: new TimeSpan(8, 0, 0),
                businessEnd: new TimeSpan(18, 0, 0),
                defaultView: DefaultCalendarView.Week,
                shading: CalendarShadingMode.ProviderAvailability,
                enforcement: AvailabilityEnforcement.BlockProvidersWarnManagers,
                requireConfirmOnOverrides: true,
                availabilityPublic: true,
                providersCanEditOwn: true,
                timeZoneId: "America/New_York",
                locale: "en-US",
                emailEnabled: false,
                smsEnabled: false,
                sendBookingConfirmation: false,
                reminderHoursBefore: null
            );

            await EnsureOrgSettingsAsync(
                db,
                org2.Id,
                minLeadMinutes: 30,
                cancelWindowHours: 12,
                showWeekends: true,
                startOfWeek: 1,
                businessStart: new TimeSpan(9, 0, 0),
                businessEnd: new TimeSpan(17, 0, 0),
                defaultView: DefaultCalendarView.Week,
                shading: CalendarShadingMode.OrgBusinessHours,
                enforcement: AvailabilityEnforcement.Warn,
                requireConfirmOnOverrides: true,
                availabilityPublic: true,
                providersCanEditOwn: true,
                timeZoneId: "America/Chicago",
                locale: "en-US",
                emailEnabled: false,
                smsEnabled: false,
                sendBookingConfirmation: false,
                reminderHoursBefore: null
            );

            // fetch tz ids for helpers below
            var org1Tz = await db.OrganizationSettings.Where(x => x.OrganizationId == org1.Id).Select(x => x.TimeZoneId).FirstAsync();
            var org2Tz = await db.OrganizationSettings.Where(x => x.OrganizationId == org2.Id).Select(x => x.TimeZoneId).FirstAsync();

            // Org1 core demo users
            var alice = await EnsureDemoUserAsync("alice", "alice@example.com", "Alice Anderson", "Manager", org1.Id);
            var bob = await EnsureDemoUserAsync("bob", "bob@example.com", "Bob Brown", "ServiceProvider", org1.Id);
            var carla = await EnsureDemoUserAsync("carla", "carla@example.com", "Carla Chen", "Client", org1.Id);

            // Org1 new provider/manager: Austin Lillis (Manager + ServiceProvider)
            var austin = await EnsureDemoUserAsync("austin", "austin.manager@fdb.local", "Austin Lillis", "Manager", org1.Id);
            if (!await userManager.IsInRoleAsync(austin, "ServiceProvider"))
                await userManager.AddToRoleAsync(austin, "ServiceProvider");

            // Org1 two additional clients
            var mike = await EnsureDemoUserAsync("mike", "mike@example.com", "Mike Miller", "Client", org1.Id);
            var nina = await EnsureDemoUserAsync("nina", "nina@example.com", "Nina Nguyen", "Client", org1.Id);

            // Org2 users: one non-provider manager, one non-manager provider, unique clients
            var dana = await EnsureDemoUserAsync("dana", "dana@example.com", "Dana Diaz", "Manager", org2.Id); // Manager only
            var eric = await EnsureDemoUserAsync("eric", "eric@example.com", "Eric Evans", "ServiceProvider", org2.Id); // Provider only
            var frank = await EnsureDemoUserAsync("frank", "frank@example.com", "Frank Fox", "Client", org2.Id);
            var gina = await EnsureDemoUserAsync("gina", "gina@example.com", "Gina Green", "Client", org2.Id);

            // -----------------------------
            // Resources / Appointment Types (org1)
            // -----------------------------
            var arena = await EnsureResourceAsync(db, org1.Id, "Main Arena", "#ff7373");
            var studio2 = await EnsureResourceAsync(db, org1.Id, "Studio 2", "#73cfff");
            var outdoor = await EnsureResourceAsync(db, org1.Id, "Outdoor Field", "#b5e48c");

            var yogaType = await EnsureAppointmentTypeAsync(db, org1.Id, "Yoga Class", TimeSpan.FromMinutes(60), 18.50m, "Group yoga for all levels.", alice.Id, arena.Id, true, true);
            var massageType = await EnsureAppointmentTypeAsync(db, org1.Id, "Therapeutic Massage", TimeSpan.FromMinutes(90), 65.00m, "Full-body massage.", bob.Id, studio2.Id, true, false);
            var soccerType = await EnsureAppointmentTypeAsync(db, org1.Id, "Youth Soccer Clinic", TimeSpan.FromMinutes(120), 25.00m, "Ages 7-13 skills & games.", alice.Id, outdoor.Id, true, false);
            var privateType = await EnsureAppointmentTypeAsync(db, org1.Id, "Private Training", TimeSpan.FromMinutes(45), 40.00m, "One-on-one coaching.", alice.Id, arena.Id, false, false);

            // New org1 type
            var acupunctureType = await EnsureAppointmentTypeAsync(
                db, org1.Id, "Acupuncture Session", TimeSpan.FromMinutes(60), 55.00m,
                "Traditional acupuncture session.", austin.Id, studio2.Id, true, false);

            // -----------------------------
            // Reservations (org1)
            // -----------------------------
            DateOnly org1Today = LocalToday(now, org1Tz);
            DateTimeOffset L1(int daysFromToday, int hour, int minute = 0) => AtLocal(now, org1Tz, org1Today, daysFromToday, hour, minute);

            await EnsureReservationCheckedAsync(db, userManager, org1.Id, carla.Id, bob.Id, yogaType.Id,
                L1(-7, 9), L1(-7, 10), arena.Id, ReservationStatus.Completed, "Completed past yoga session.", now);

            await EnsureReservationCheckedAsync(db, userManager, org1.Id, carla.Id, bob.Id, massageType.Id,
                L1(-3, 14), L1(-3, 15).AddMinutes(30), studio2.Id, ReservationStatus.NoShow, "Missed massage, client did not show.", now);

            await EnsureReservationCheckedAsync(db, userManager, org1.Id, carla.Id, bob.Id, soccerType.Id,
                L1(0, 17), L1(0, 19), outdoor.Id, ReservationStatus.Booked, "Alice's kids' soccer clinic.", now);

            await EnsureReservationCheckedAsync(db, userManager, org1.Id, carla.Id, bob.Id, soccerType.Id,
                L1(2, 10), L1(2, 12), outdoor.Id, ReservationStatus.Booked, "Morning soccer camp, outdoor.", now);

            await EnsureReservationCheckedAsync(db, userManager, org1.Id, carla.Id, bob.Id, privateType.Id,
                L1(10, 16), L1(10, 16).AddMinutes(45), arena.Id, ReservationStatus.Canceled, "Cancelled by client.", now);

            for (int i = 0; i < 7; i++)
            {
                await EnsureReservationCheckedAsync(db, userManager, org1.Id, carla.Id, bob.Id, massageType.Id,
                    L1(i, 11), L1(i, 11).AddMinutes(60), studio2.Id, ReservationStatus.Booked, "Daily massage demo slot.", now, allowDuplicate: false);
            }

            // Austin-led wellness set
            await EnsureReservationCheckedAsync(db, userManager, org1.Id, mike.Id, austin.Id, acupunctureType.Id,
                L1(1, 9), L1(1, 10), studio2.Id, ReservationStatus.Booked, "Initial consult + acupuncture.", now);

            await EnsureReservationCheckedAsync(db, userManager, org1.Id, nina.Id, austin.Id, acupunctureType.Id,
                L1(2, 13), L1(2, 14), studio2.Id, ReservationStatus.Booked, "Stress relief session.", now);

            await EnsureReservationCheckedAsync(db, userManager, org1.Id, carla.Id, austin.Id, privateType.Id,
                L1(3, 16), L1(3, 17), arena.Id, ReservationStatus.Booked, "Core strength training.", now);

            await EnsureReservationCheckedAsync(db, userManager, org1.Id, carla.Id, austin.Id, acupunctureType.Id,
                L1(-1, 15), L1(-1, 16), studio2.Id, ReservationStatus.Completed, "Follow-up acupuncture session.", now);

            // -----------------------------
            // BlockedTimes (org1)
            // -----------------------------
            await EnsureBlockedTimeAsync(db, org1.Id, arena.Id, "Floor waxing",
                L1(1, 12), L1(1, 15), "#cccccc", alice.Id);

            await EnsureBlockedTimeAsync(db, org1.Id, arena.Id, "Private booking",
                L1(5, 18), L1(5, 21), "#fcba03", bob.Id);

            // -----------------------------
            // Org2 sample — use org2 timezone
            // -----------------------------
            var studioA = await EnsureResourceAsync(db, org2.Id, "Studio A", "#a0c4ff");
            var turf = await EnsureResourceAsync(db, org2.Id, "Turf Field", "#caffbf");
            var pilates = await EnsureAppointmentTypeAsync(db, org2.Id, "Pilates", TimeSpan.FromMinutes(50), 22.00m, "Mat pilates.", dana.Id, studioA.Id, true, false);

            DateOnly org2Today = LocalToday(now, org2Tz);
            DateTimeOffset L2(int daysFromToday, int hour, int minute = 0) => AtLocal(now, org2Tz, org2Today, daysFromToday, hour, minute);

            await EnsureReservationCheckedAsync(db, userManager, org2.Id, frank.Id, eric.Id, pilates.Id,
                L2(1, 9), L2(1, 10), studioA.Id, ReservationStatus.Booked, "Org2 pilates.", now);

            await EnsureReservationCheckedAsync(db, userManager, org2.Id, gina.Id, eric.Id, pilates.Id,
                L2(2, 14), L2(2, 15), studioA.Id, ReservationStatus.Booked, "Intro pilates session.", now);

            return;

            // ============================================================
            // Helpers
            // ============================================================

            static DateOnly LocalToday(DateTimeOffset now, string tzId)
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
                var localNow = TimeZoneInfo.ConvertTime(now, tz);
                return DateOnly.FromDateTime(localNow.Date);
            }

            static DateTimeOffset AtLocal(DateTimeOffset now, string tzId, DateOnly baseLocalDay, int daysFromToday, int hour, int minute = 0)
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
                var localDateTime = baseLocalDay.AddDays(daysFromToday).ToDateTime(new TimeOnly(hour, minute));
                var unspecified = DateTime.SpecifyKind(localDateTime, DateTimeKind.Unspecified);
                var offset = tz.GetUtcOffset(unspecified);
                return new DateTimeOffset(unspecified, offset); // keep local offset; DB stores DateTimeOffset
            }

            async Task<ApplicationUser> EnsureDemoUserAsync(string username, string email, string fullName, string role, string organizationId)
            {
                var user = await userManager.FindByEmailAsync(email) ?? await userManager.FindByNameAsync(username);
                if (user is null)
                {
                    user = new ApplicationUser
                    {
                        UserName = username,
                        Email = email,
                        FullName = fullName,
                        EmailConfirmed = true,
                        OrganizationId = organizationId
                    };
                    await userManager.CreateAsync(user, "Password123!");
                }
                else
                {
                    var needsUpdate = false;
                    if (user.Email != email) { user.Email = email; user.EmailConfirmed = true; needsUpdate = true; }
                    if (user.FullName != fullName) { user.FullName = fullName; needsUpdate = true; }
                    if (user.OrganizationId != organizationId) { user.OrganizationId = organizationId; needsUpdate = true; }
                    if (needsUpdate) await userManager.UpdateAsync(user);
                }

                if (!await userManager.IsInRoleAsync(user, role))
                    await userManager.AddToRoleAsync(user, role);

                return user;
            }

            static async Task<Organization> EnsureOrganizationAsync(ApplicationDbContext db, string id, string name)
            {
                var org = await db.Organizations.FirstOrDefaultAsync(o => o.Id == id);
                if (org is null)
                {
                    org = new Organization { Id = id, Name = name };
                    db.Organizations.Add(org);
                    await db.SaveChangesAsync();
                }
                else if (org.Name != name)
                {
                    org.Name = name;
                    await db.SaveChangesAsync();
                }
                return org;
            }

            static async Task<CalendarResource> EnsureResourceAsync(ApplicationDbContext db, string organizationId, string name, string? backColor)
            {
                var res = await db.CalendarResources.FirstOrDefaultAsync(r => r.OrganizationId == organizationId && r.Name == name);
                if (res is null)
                {
                    res = new CalendarResource { OrganizationId = organizationId, Name = name, BackColor = backColor, IsDeleted = false };
                    db.CalendarResources.Add(res);
                    await db.SaveChangesAsync();
                }
                else
                {
                    var changed = false;
                    if (res.BackColor != backColor) { res.BackColor = backColor; changed = true; }
                    if (changed) await db.SaveChangesAsync();
                }
                return res;
            }

            static async Task<AppointmentType> EnsureAppointmentTypeAsync(
                ApplicationDbContext db,
                string organizationId,
                string name,
                TimeSpan duration,
                decimal price,
                string? description,
                string createdByUserId,
                int? assignedResourceId,
                bool isPublic,
                bool requiresWaiver)
            {
                var type = await db.AppointmentTypes.FirstOrDefaultAsync(a => a.OrganizationId == organizationId && a.Name == name);
                if (type is null)
                {
                    type = new AppointmentType
                    {
                        OrganizationId = organizationId,
                        Name = name,
                        Duration = duration,
                        Price = price,
                        Description = description,
                        CreatedByUserId = createdByUserId,
                        AssignedResourceId = assignedResourceId,
                        IsPublic = isPublic,
                        RequiresWaiver = requiresWaiver,
                        IsDeleted = false
                    };
                    db.AppointmentTypes.Add(type);
                    await db.SaveChangesAsync();
                }
                else
                {
                    var changed = false;
                    if (type.Duration != duration) { type.Duration = duration; changed = true; }
                    if (type.Price != price) { type.Price = price; changed = true; }
                    if (type.Description != description) { type.Description = description; changed = true; }
                    if (type.AssignedResourceId != assignedResourceId) { type.AssignedResourceId = assignedResourceId; changed = true; }
                    if (type.IsPublic != isPublic) { type.IsPublic = isPublic; changed = true; }
                    if (type.RequiresWaiver != requiresWaiver) { type.RequiresWaiver = requiresWaiver; changed = true; }
                    if (changed) await db.SaveChangesAsync();
                }
                return type;
            }

            static async Task EnsureReservationCheckedAsync(
                ApplicationDbContext db,
                UserManager<ApplicationUser> um,
                string organizationId,
                string clientId,
                string providerId,
                int typeId,
                DateTimeOffset start,
                DateTimeOffset end,
                int? resourceId,
                ReservationStatus status,
                string? notes,
                DateTimeOffset nowUtc,
                bool allowDuplicate = false)
            {
                var client = await um.FindByIdAsync(clientId);
                if (client is null || client.OrganizationId != organizationId || !await um.IsInRoleAsync(client, "Client"))
                    throw new InvalidOperationException($"Seed error: clientId '{clientId}' must be a Client in org '{organizationId}'.");

                var provider = await um.FindByIdAsync(providerId);
                if (provider is null || provider.OrganizationId != organizationId || !await um.IsInRoleAsync(provider, "ServiceProvider"))
                    throw new InvalidOperationException($"Seed error: providerId '{providerId}' must be a ServiceProvider in org '{organizationId}'.");

                await EnsureReservationAsync(db, organizationId, clientId, providerId, typeId, start, end, resourceId, status, notes, nowUtc, allowDuplicate);
            }

            static async Task EnsureReservationAsync(
                ApplicationDbContext db,
                string organizationId,
                string clientId,
                string providerId,
                int typeId,
                DateTimeOffset start,
                DateTimeOffset end,
                int? resourceId,
                ReservationStatus status,
                string? notes,
                DateTimeOffset nowUtc,
                bool allowDuplicate = false)
            {
                var exists = await db.Reservations.AnyAsync(r =>
                    r.OrganizationId == organizationId &&
                    r.ClientId == clientId &&
                    r.ServiceProviderId == providerId &&
                    r.AppointmentTypeId == typeId &&
                    r.StartTime == start &&
                    r.EndTime == end);

                if (exists && !allowDuplicate)
                {
                    return; // already present; do not add another
                }

                db.Reservations.Add(new Reservation
                {
                    OrganizationId = organizationId,
                    ClientId = clientId,
                    ServiceProviderId = providerId,
                    AppointmentTypeId = typeId,
                    StartTime = start,
                    EndTime = end,
                    ResourceId = resourceId,
                    Status = status,
                    Notes = notes,
                    CreatedAt = nowUtc,
                    IsDeleted = false
                });
                await db.SaveChangesAsync();
            }

            static async Task EnsureBlockedTimeAsync(
                ApplicationDbContext db,
                string organizationId,
                int resourceId,
                string reason,
                DateTimeOffset start,
                DateTimeOffset end,
                string? backColor,
                string createdByUserId)
            {
                var exists = await db.BlockedTimes.AnyAsync(b =>
                    b.OrganizationId == organizationId &&
                    b.ResourceId == resourceId &&
                    b.Reason == reason &&
                    b.StartTime == start &&
                    b.EndTime == end);

                if (exists) return;

                db.BlockedTimes.Add(new BlockedTime
                {
                    OrganizationId = organizationId,
                    ResourceId = resourceId,
                    Reason = reason,
                    StartTime = start,
                    EndTime = end,
                    BackColor = backColor,
                    CreatedByUserId = createdByUserId,
                    IsDeleted = false
                });
                await db.SaveChangesAsync();
            }

            static async Task<int?> FindReservationIdAsync(
                ApplicationDbContext db,
                string organizationId,
                string clientId,
                string providerId,
                int typeId,
                DateTimeOffset start,
                DateTimeOffset end)
            {
                return await db.Reservations
                    .Where(r => r.OrganizationId == organizationId &&
                                r.ClientId == clientId &&
                                r.ServiceProviderId == providerId &&
                                r.AppointmentTypeId == typeId &&
                                r.StartTime == start &&
                                r.EndTime == end)
                    .Select(r => (int?)r.Id)
                    .FirstOrDefaultAsync();
            }

            static async Task EnsureParticipantAsync(
                ApplicationDbContext db,
                int reservationId,
                string organizationId,
                ReservationParticipantRole role,
                string? userId = null,
                string? guestName = null,
                string? guestPhone = null)
            {
                bool exists;
                if (role == ReservationParticipantRole.Guest)
                {
                    exists = await db.ReservationParticipants.AnyAsync(rp =>
                        rp.ReservationId == reservationId &&
                        rp.OrganizationId == organizationId &&
                        rp.Role == ReservationParticipantRole.Guest &&
                        !rp.IsDeleted &&
                        rp.GuestName == guestName &&
                        rp.GuestPhone == guestPhone);
                }
                else
                {
                    if (string.IsNullOrWhiteSpace(userId)) return;
                    exists = await db.ReservationParticipants.AnyAsync(rp =>
                        rp.ReservationId == reservationId &&
                        rp.OrganizationId == organizationId &&
                        rp.UserId == userId &&
                        !rp.IsDeleted);
                }

                if (exists) return;

                db.ReservationParticipants.Add(new ReservationParticipant
                {
                    ReservationId = reservationId,
                    OrganizationId = organizationId,
                    Role = role,
                    UserId = role == ReservationParticipantRole.Guest ? null : userId,
                    GuestName = role == ReservationParticipantRole.Guest ? guestName : null,
                    GuestPhone = role == ReservationParticipantRole.Guest ? guestPhone : null,
                    IsDeleted = false
                });
                await db.SaveChangesAsync();
            }

            static async Task EnsureOrgSettingsAsync(
                ApplicationDbContext db,
                string organizationId,
                int minLeadMinutes,
                int cancelWindowHours,
                bool showWeekends,
                int startOfWeek,
                TimeSpan businessStart,
                TimeSpan businessEnd,
                DefaultCalendarView defaultView,
                CalendarShadingMode shading,
                AvailabilityEnforcement enforcement,
                bool requireConfirmOnOverrides,
                bool availabilityPublic,
                bool providersCanEditOwn,
                string timeZoneId,
                string locale,
                bool emailEnabled,
                bool smsEnabled,
                bool sendBookingConfirmation,
                int? reminderHoursBefore)
            {
                var s = await db.OrganizationSettings.FirstOrDefaultAsync(x => x.OrganizationId == organizationId);
                if (s is null)
                {
                    s = new OrganizationSettings
                    {
                        OrganizationId = organizationId,
                        MinLeadMinutes = minLeadMinutes,
                        CancelWindowHours = cancelWindowHours,
                        ShowWeekends = showWeekends,
                        StartOfWeek = startOfWeek,
                        BusinessHoursStartLocal = businessStart,
                        BusinessHoursEndLocal = businessEnd,
                        DefaultView = defaultView,
                        ShadingMode = shading,
                        AvailabilityEnforcement = enforcement,
                        RequireConfirmOnOverrides = requireConfirmOnOverrides,
                        AvailabilityPublic = availabilityPublic,
                        ProvidersCanEditOwnAvailability = providersCanEditOwn,
                        TimeZoneId = timeZoneId,
                        Locale = locale,
                        EmailEnabled = emailEnabled,
                        SmsEnabled = smsEnabled,
                        SendBookingConfirmation = sendBookingConfirmation,
                        ReminderHoursBefore = reminderHoursBefore
                    };
                    db.OrganizationSettings.Add(s);
                    await db.SaveChangesAsync();
                }
                else
                {
                    var changed = false;
                    if (s.MinLeadMinutes != minLeadMinutes) { s.MinLeadMinutes = minLeadMinutes; changed = true; }
                    if (s.CancelWindowHours != cancelWindowHours) { s.CancelWindowHours = cancelWindowHours; changed = true; }
                    if (s.ShowWeekends != showWeekends) { s.ShowWeekends = showWeekends; changed = true; }
                    if (s.StartOfWeek != startOfWeek) { s.StartOfWeek = startOfWeek; changed = true; }
                    if (s.BusinessHoursStartLocal != businessStart) { s.BusinessHoursStartLocal = businessStart; changed = true; }
                    if (s.BusinessHoursEndLocal != businessEnd) { s.BusinessHoursEndLocal = businessEnd; changed = true; }
                    if (s.DefaultView != defaultView) { s.DefaultView = defaultView; changed = true; }
                    if (s.ShadingMode != shading) { s.ShadingMode = shading; changed = true; }
                    if (s.AvailabilityEnforcement != enforcement) { s.AvailabilityEnforcement = enforcement; changed = true; }
                    if (s.RequireConfirmOnOverrides != requireConfirmOnOverrides) { s.RequireConfirmOnOverrides = requireConfirmOnOverrides; changed = true; }
                    if (s.AvailabilityPublic != availabilityPublic) { s.AvailabilityPublic = availabilityPublic; changed = true; }
                    if (s.ProvidersCanEditOwnAvailability != providersCanEditOwn) { s.ProvidersCanEditOwnAvailability = providersCanEditOwn; changed = true; }
                    if (s.TimeZoneId != timeZoneId) { s.TimeZoneId = timeZoneId; changed = true; }
                    if (s.Locale != locale) { s.Locale = locale; changed = true; }
                    if (s.EmailEnabled != emailEnabled) { s.EmailEnabled = emailEnabled; changed = true; }
                    if (s.SmsEnabled != smsEnabled) { s.SmsEnabled = smsEnabled; changed = true; }
                    if (s.SendBookingConfirmation != sendBookingConfirmation) { s.SendBookingConfirmation = sendBookingConfirmation; changed = true; }
                    if (s.ReminderHoursBefore != reminderHoursBefore) { s.ReminderHoursBefore = reminderHoursBefore; changed = true; }

                    if (changed) await db.SaveChangesAsync();
                }
            }

            static async Task EnsureProviderAvailabilityAsync(
                ApplicationDbContext db,
                string organizationId,
                string serviceProviderId,
                DayOfWeek dayOfWeek,
                TimeSpan startLocalTime,
                TimeSpan endLocalTime,
                DateOnly effectiveFrom,
                DateOnly effectiveTo)
            {
                var exists = await db.ProviderAvailabilities.AnyAsync(a =>
                    a.OrganizationId == organizationId &&
                    a.ServiceProviderId == serviceProviderId &&
                    a.DayOfWeek == dayOfWeek &&
                    a.StartLocalTime == startLocalTime &&
                    a.EndLocalTime == endLocalTime &&
                    a.EffectiveFrom == effectiveFrom &&
                    a.EffectiveTo == effectiveTo &&
                    !a.IsDeleted);

                if (exists) return;

                db.ProviderAvailabilities.Add(new ProviderAvailability
                {
                    OrganizationId = organizationId,
                    ServiceProviderId = serviceProviderId,
                    DayOfWeek = dayOfWeek,
                    StartLocalTime = startLocalTime,
                    EndLocalTime = endLocalTime,
                    EffectiveFrom = effectiveFrom,
                    EffectiveTo = effectiveTo,
                    IsDeleted = false
                });
                await db.SaveChangesAsync();
            }
        }
    }
}

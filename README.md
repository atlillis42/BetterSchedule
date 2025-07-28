BetterSchedule

A flexible, role-based scheduling platform for service businesses and teams, built with React (SPA) & ASP.NET Core 8.
Project Goals

BetterSchedule aims to provide a powerful scheduling and booking system with multi-role access, customizable services, and extensible features for both web and mobile.

    Managers: Manage users, services, bookings, and system settings.

    Service Providers: Define their own availability, appointment types, and client bookings.

    Clients: Self-register, view, and manage their own appointments.

Live Status

    ✅ Authentication & roles: ASP.NET Core Identity, cookie-based login, user roles (Manager, Service Provider, Client), dev DB seeding, and front-end protected route logic.

    ✅ Calendar Core: Full CRUD for events/resources (DayPilot-based), robust event modal validation, and multi-view calendar (Day/Week/Month/Resource) with complete tests.

    ✅ Front-End Auth Context: React SPA state for login/logout, role switching, and protected UI.

    ✅ Testing: Comprehensive tests for calendar UI, modals, and API edge cases.

    ✅ Dev Tools: Demo data seeding and DB reset for quick starts.

    ❌ Reservation/Booking Model: Not yet implemented (currently only calendar events/resources, no true “reservations”/“appointment types”/“packages”).

    ❌ Availability Setup: No models/endpoints/UI for providers to set open/blocked hours.

    ❌ Appointment Types/Services: Not yet implemented in backend or UI.

    ❌ Package/Session Tracking: No packages, decrementing, or package assignment yet.

    ❌ Role-based Data Filtering: Not yet enforcing per-role data visibility in calendar or API.

    ❌ Payment, Documents, Notifications: Not yet implemented.

    ❌ Reporting & History: Not yet implemented.

    ❌ Admin UI for role/user management: Not yet implemented.

Screenshots

Coming soon. Features include themed DayPilot calendar, multi-view support, event modal popups, and role-based UI skeleton.
Tech Stack

    Frontend: React (Vite), DayPilot Lite, TypeScript, Tailwind CSS

    Backend: ASP.NET Core 8, Entity Framework Core, ASP.NET Identity

    Database: SQL Server (localdb for dev), EF Core Migrations

    Testing: Vitest, React Testing Library, xUnit (back end)

    Dev Tools: DB reset endpoints, dev login/testing helpers

MVP Feature List

    User login and role-based access (Manager, Provider, Client)

    Calendar with multi-view (Day, Week, Month, Resource)

    CRUD for calendar events/resources via modals

    Event validation and error handling (no invalid times, required fields enforced)

    Protected frontend routes & role context

    Automated test coverage for calendar and API flows

    Dev data seeding and DB reset for fast start

Immediate Roadmap / Next Steps
Short-Term Priorities:

    Reservations & Booking

        Add Reservation and AppointmentType models (DB, API, UI)

        Booking and cancellation logic for clients

        Link reservations to calendar events

    Availability Management

        Allow providers to set/edit available times

        Enforce/validate booking within availability

    Role-Based Filtering & Permissions

        Restrict calendar/event visibility by role (own vs. all)

        Enforce role-based CRUD permissions in API & UI

    Packages & Session Tracking

        Implement Packages and auto-decrementing logic

        Connect reservations to packages

    Admin & User Management UI

        UI for role assignment, user management, and calendar/resource assignment

    Error Handling/Notifications

        Replace browser alerts with toast/snackbar UX for errors and success

    API Caching Layer

        Add React Query/SWR for event/resource APIs

Long-Term / Full Feature Goals

    Client self-registration, duplicate account merge

    Custom appointment types (per manager/provider)

    Payments & transaction history (Stripe or similar)

    Document/waiver uploads and versioning

    Location/capacity management

    Reservation/appointment history & reporting

    Mobile responsive UI and PWA

    External calendar sync (Google, Apple, iCal)

    Soft deletes, audit logs, tagging, advanced filtering

    Admin dashboards, user analytics, dark mode

Models (in Progress / Planned)

    ApplicationUser: Auth & profile info, roles

    Reservation: Booked instance of an AppointmentType, linked to user/provider

    AppointmentType: Service definition (duration, location, price, waiver)

    Package: Assignable, auto-decrementing sessions

    Location: Bookable spaces, with capacity/hours

    AvailabilitySlot: Provider-specific open/blocked times

Setup & Development

    Clone repo and run dotnet ef database update to apply migrations and seed dev data

    Start backend (dotnet run) and frontend (npm run dev)

    Access dev login for demo roles (manager, provider, client)

    Use /api/devtools/reset-db to reset DB state in dev

Testing

    Run npm run test (front end) for all UI/API/unit tests

    Backend: dotnet test

Contributing

Pull requests and issue tickets welcome!
Roadmap is visible in this README—please file issues for bugs or feature requests.
New contributors: see /docs for API/data model plans.
License

MIT License

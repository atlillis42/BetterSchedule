BetterSchedule

A flexible, role-based scheduling platform for service businesses and teams, built with React (SPA) & ASP.NET Core 8.
Project Goals

BetterSchedule aims to provide a powerful scheduling and booking system with multi-role access, customizable services, and extensible features for both web and mobile.

    Managers: Manage users, services, bookings, and system settings.

    Service Providers: Define their own availability, appointment types, and client bookings.

    Clients: Self-register, view, and manage their own appointments.

Live Status (August 2025)

✅ Authentication & roles:

    ASP.NET Core Identity, cookie-based login

    User roles (Manager, Service Provider, Client)

    Dev DB seeding and front-end protected route logic

✅ Calendar Core:

    Full CRUD for reservations and blocked times, with custom React modals and robust validation

    Multi-view DayPilot calendar (Day/Week/Month/Resource)

    Event mapping, color-coding, and state management overhaul

    Toast notifications for all actions (via react-toastify)

✅ Front-End Auth Context:

    React SPA state for login/logout, role switching, and protected UI

✅ Dev Tools:

    Demo data seeding and DB reset for quick starts

⏳ Reservations & Booking:

    [In Progress] New models and CRUD for Reservations and Appointment Types

    Async client search and dynamic resource selection in modal forms

⏳ API/Validation Refactor:

    Modular API logic (reservation, blocked time, resources, client search)

    Centralized axios instance with global error handling

    Custom validation for each event type

⏳ UI/UX Enhancements:

    Improved modal design, toolbar controls, and mobile-responsiveness

    Role-based routing, MainLayout, and consistent app styling

❌ Availability Setup: Provider hours, open/blocked slot management
❌ Package/Session Tracking
❌ Payment, Documents, Notifications
❌ Admin UI for role/user/resource management
❌ Advanced Reporting, History, Audit, Analytics
Screenshots

Coming soon: New calendar UI, modals, toast notifications, and themed layouts!
Tech Stack

    Frontend: React (Vite), DayPilot Lite, TypeScript, Tailwind CSS, react-toastify

    Backend: ASP.NET Core 8, Entity Framework Core, ASP.NET Identity

    Database: SQL Server (localdb for dev), EF Core Migrations

    Testing: Vitest, React Testing Library, xUnit (backend)

    Dev Tools: DB reset endpoints, demo login/testing helpers

MVP Feature List

User login and role-based access (Manager, Provider, Client)

Calendar with multi-view (Day, Week, Month, Resource)

CRUD for reservations and blocked times via custom modals

Field validation and error handling (required fields, date/time logic)

Protected frontend routes & role context

Toast notifications for all user actions and API errors

    Dev data seeding and DB reset for fast start

Immediate Roadmap / Next Steps
Short-Term Priorities:
Reservations & Booking

Add Reservation and AppointmentType models (DB, API, UI)

Booking and cancellation logic for clients

    Link reservations to packages (future)

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

Models (In Progress / Planned)

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

**Questions, feature requests, or bugs? File an Issue or start a PR—thanks for checking out BetterSchedule

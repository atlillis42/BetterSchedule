# BetterSchedule

A flexible, role-based scheduling platform for service businesses and teams, built with **React (SPA)** and **ASP.NET Core 8**.  
BetterSchedule supports managers, service providers, and clients in booking, managing, and tracking appointments — with the flexibility to extend features over time for payments, multi-location support, notifications, and more.

Designed for both **web and mobile**, the platform focuses on **clean architecture, modular APIs, and scalable role-based access control**.

---

## Core Value

- **Managers**: Manage users, services, bookings, and system settings  
- **Service Providers**: Set availability, define services, manage clients and bookings  
- **Clients**: Self-register, view, and manage their own appointments

---

## Live Status

**Last updated:** August 25, 2025  
**Legend:** ✅ implemented ⏳ foundation present (not surfaced end-to-end) ❌ not implemented

| Feature Category | Status | Notes |
|---|:---:|---|
| Authentication & Roles | ✅ | ASP.NET Identity with role seeding; cookie auth. |
| Multi-Tenant Organization Scope | ✅ | Controllers derive `org_id` from claims; entities carry `OrganizationId`; per-org uniqueness/indexing; soft-delete patterns respected. |
| Frontend Auth Context | ✅ | SPA role context; login/logout helpers; org awareness. |
| Calendar Core (Day/Week/Month/Resource) | ✅ | DayPilot views; CRUD for reservations and blocked times. |
| Reservations & Booking | ✅ | Appointment types (duration, price, waiver flag, optional default resource); role-aware visibility and editing rules. |
| Client & Provider Search | ✅ | Async client lookup for modals; provider lists. |
| Calendar Resource Management | ✅ | Manager UI for CRUD, color coding, per-resource blocked times; role-aware filtering; integrates with DayPilot Resources view. |
| Conflict Detection & Double-Booking Alerts | ✅ | Central `SchedulingConflictService` checks overlaps against reservations/blocked times; controllers surface errors and warning headers for provider double-booking. |
| Reservation Status & Soft Deletes | ✅ | Lifecycle: Booked/Completed/Canceled/NoShow; reversible archival with `IsDeleted` across reservations, blocked times, appointment types, resources, users. |
| API/Validation & Axios Refactor | ✅ | Central Axios instance; server-side validation; conflict checks; standardized error handling. |
| UI/UX Enhancements | ✅ | Event modal, toolbar controls, responsive layout. |
| Developer Utilities & Swagger | ✅ | Dev endpoints (`whoami`, `reset-db`, blocked-time dumps); Swagger/OpenAPI UI in development. |
| Automated Tests | ✅ | xUnit tests for dev login endpoints; base for further backend automation. |
| Group/Participant Support | ✅ | UI and APIs for multi-client, guest, and secondary provider participation. |
| Availability Setup | ✅ | Provider availability editor with enforcement and shading modes. |
| Package/Session Tracking | ✅ | Packages, assignments, and redemption tracking. |
| Admin UI & Role Management | ✅ | Org settings, user/role manager, provider access controls. |
| Lead/Cancel Windows | ✅ | `MinLeadMinutes` & `CancelWindowHours` guardrails on create/reschedule/cancel. |

---

## Next Phase: Bug Fix & Polish

- **Expand automated test coverage across backend and frontend.
- **Cross-browser and responsive layout tuning.
- **Accessibility review and improved error messaging.
- **Performance profiling and minor UX refinements.
- **Advanced Reporting / Analytics 

---

## Post-MVP / Roadmap

- **Audit & History**: UI for soft-deleted items and change history/restore.
- **Recurring Reservations & Templates**: Series support (`RecurrenceId`), schedule templates per provider/resource.  
- **Waivers & Documents**: Uploads, e-sign, attachment storage; enforce `RequiresWaiver`.  
- **Payments**: Stripe (or similar) for deposits, payments, refunds.  
- **Notifications**: Email/SMS confirmations, reminders, configurable rules.  
- **Timezone & Calendar Sync**: Per-user/org TZ/locale; Google/Outlook/ICS two-way sync; DST handling.  
- **Capacity & Overbooking Controls**: Resource capacity (e.g., class size) and waitlists; **AppointmentType capacity (class size limit)**.  
- **Security & Integrations**: 2FA/SSO, API tokens, suspicious-login alerts.  
- **Internationalization & Theming**: Multi-language, dark mode.  
- **Admin & Reporting**: Dashboards for usage, cancellations, upcoming appointments.  
- **Mobile/PWA**: Offline mode, push notifications.  
- **Auth Flows**: OAuth providers, password recovery.
- **PATCH Update**: Move to more robust JSON Patch partial updates in lieu of existing PUT functionality.

---

## Tech Stack

**Frontend:** React (Vite), DayPilot Lite, TypeScript, Tailwind CSS, `react-toastify`  
**Backend:** ASP.NET Core 8, Entity Framework Core, ASP.NET Identity  
**Database:** SQL Server (LocalDB for dev)  
**Testing:** Vitest, React Testing Library (frontend), xUnit (backend)  
**Dev Tools:** DB reset endpoints, demo logins

---

## Setup & Development

```bash
# Apply migrations and seed dev data
dotnet ef database update

# Start backend
dotnet run

# Start frontend
npm install
npm run dev
```

- Demo logins available for manager, provider, and client roles.  
- Use `/api/devtools/reset-db` to reset the database in development.

---

## Testing

```bash
# Frontend
npm run test

# Backend
dotnet test
```

---

## Contributing
Pull requests and issues are welcome.
The roadmap is visible in this README — please open issues for bugs or feature requests.
See [API docs](docs/api) and [domain models](docs/models/overview.md) for more details., and read the [contributing guide](CONTRIBUTING.md) for branching, commit, and code style conventions.

---

## License

MIT License.

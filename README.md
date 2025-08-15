# **BetterSchedule**

A flexible, role-based scheduling platform for service businesses and teams, built with **React (SPA)** and **ASP.NET Core 8**.  
BetterSchedule supports managers, service providers, and clients in booking, managing, and tracking appointments — with the flexibility to extend features over time for payments, multi-location support, notifications, and more.

Designed for both **web and mobile**, the platform focuses on **clean architecture, modular APIs, and scalable role-based access control**.

---

## **Core Value**
- **Managers**: Manage users, services, bookings, and system settings  
- **Service Providers**: Set availability, define services, manage clients and bookings  
- **Clients**: Self-register, view, and manage their own appointments  

---

## **Live Status (August 2025)**

✅ **Authentication & Roles**  
- Cookie-based ASP.NET Core Identity with seeded roles  
- Developer login endpoints for local testing  
- Role-based access control for Manager, Service Provider, and Client  

✅ **Calendar Core**  
- Reservations and blocked times with full CRUD APIs  
- Role-aware filtering in API and UI  
- Day/Week/Month/Resource views via DayPilot  

✅ **Frontend Auth Context**  
- Tracks authentication state, roles, and organization ID  
- Login/logout helpers and toast notifications for feedback  

✅ **Developer Utilities**  
- Database seeding for demo data  
- Multiple “dev login” endpoints for rapid resets and testing  

✅ **Reservations & Booking**  
- Reservation and AppointmentType models, APIs, and React modals  
- Async client search in booking modals  
- End-to-end booking and cancellation flows  

✅ **API/Validation Refactor**  
- Centralized Axios instance with global error handling  
- Form helpers for reservation validation before submission  

✅ **UI/UX Enhancements**  
- Modernized event modals and toolbar controls  
- Role-aware editing flows  
- Mobile-responsive layout improvements  

❌ **Not Yet Implemented** *(Future Work)*  
- Availability management  
- Package/session tracking  
- Payments  
- Document and notification handling  
- Admin UI for user/resource management  
- Advanced reporting & analytics  

---

## **Feature Breakdown**

### **Minimum Viable Product (MVP)**
A deployable scheduling platform where authenticated users can manage a calendar and book services.

**Core MVP Features**
1. **Authentication & Authorization**
   - Login with cookie-based ASP.NET Core Identity
   - Roles: Manager, Service Provider, Client
   - Role assignment UI for managers

2. **Calendar**
   - Day/Week/Month/Resource views
   - CRUD for reservations and blocked times
   - Conflict detection and validation
   - Event color-coding by type/resource
   - Protected routes and role-aware views

3. **Reservations & Appointment Types**
   - Create/manage AppointmentTypes (Managers & Providers)
   - Book, view, and cancel reservations
   - Validation: required fields, date/time logic, availability rules

4. **Availability Management**
   - Provider-set availability slots
   - Enforce booking within availability

5. **Client Experience**
   - Clients view their own bookings
   - Client self-registration

6. **Developer Tools**
   - Demo data seeding
   - DB reset endpoints

---

### **Post-MVP / Future Enhancements**
**Core Extensions**
- **Packages & Session Tracking**
  - Auto-decrementing packages tied to AppointmentTypes
  - Session restoration on early cancel

- **Payments**
  - Stripe or similar integration
  - Transaction history & refunds

- **Documents & Waivers**
  - Upload, storage, and versioning
  - Link signed waivers to reservations

- **Notifications**
  - Email/SMS reminders, confirmations, and updates
  - Manager-controlled notification rules

- **Reporting & Analytics**
  - Provider & Manager dashboards
  - Exportable history and audit logs

- **Admin UI**
  - Role & user management
  - Resource/location assignment

**Advanced Features**
- Multi-location and resource capacity management
- External calendar sync (Google, iCal, Apple)
- Soft deletes & audit trail UI
- Schedule templates
- Tagging system for clients/reservations
- Dark mode & theming
- PWA/mobile app support
- Waitlists & promo codes
- AI-assisted scheduling recommendations

---

## **Tech Stack**
**Frontend**: React (Vite), DayPilot Lite, TypeScript, Tailwind CSS, react-toastify  
**Backend**: ASP.NET Core 8, Entity Framework Core, ASP.NET Identity  
**Database**: SQL Server (LocalDB for dev)  
**Testing**: Vitest, React Testing Library (frontend), xUnit (backend)  
**Dev Tools**: DB reset endpoints, demo logins

---

## **Setup & Development**
\`\`\`bash
# Apply migrations and seed dev data
dotnet ef database update

# Start backend
dotnet run

# Start frontend
npm install
npm run dev
\`\`\`
- Demo logins available for manager, provider, and client roles  
- Use \`/api/devtools/reset-db\` to reset database in dev

---

## **Testing**
\`\`\`bash
# Frontend
npm run test

# Backend
dotnet test
\`\`\`

---

## **Contributing**
Pull requests and issues are welcome.  
The roadmap is visible in this README — please open issues for bugs or feature requests.  
See \`/docs\` for API and data model plans.

---

## **License**
MIT License

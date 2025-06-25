# Scheduling Application – MVP & Feature Roadmap

## MVP Scope

**Goal**: Deploy a working scheduling platform where users can log in, manage their calendar, and book/reserve services.

### 1. Authentication & Roles
- Cookie-based login system (ASP.NET Core Identity)
- Roles: Manager, Service Provider, Client
- Role admin can assign/revoke roles

### 2. Calendar Functionality
- React SPA with DayPilot integration
- Day, Week, Month, and Resource views
- Users can define availability
- Users can view/book/cancel appointments
- Prevent double-bookings

**Reservations link to:**
- Guest Name  
- Date/Time  
- Reservation Type  
- (Optional) Reservation Length  
- (Optional) Location  

### 3. Appointment & Reservation Types
- Users can define appointment types
- Basic CRUD for reservation types
- Track reservation history per user

### 4. Packages
- Auto-decrementing package system
- Assigned to users/clients
- Basic validation when out of sessions

### 5. Backend API
**Models:**
- ApplicationUser  
- Reservation  
- AppointmentType  
- Package  
- Location  

- Endpoints secured with role-based auth

### 6. UI Components
- Login Page
- Calendar Component
- Booking Component
- Availability Setup
- Client View
- Roles Admin

### 7. Admin Capabilities
- Role & user management
- Assign providers to calendars

### 8. Infrastructure
- Frontend: React + DayPilot
- Backend: ASP.NET Core 8
- DB: EF Core with migrations
- Testing & Debugging Suite (Unit Tests)

---

## Post-MVP / Full Feature Roadmap

### Core Enhancements
- External Auth (Google, Microsoft)
- Payment Integration (Stripe / Google Pay / Venmo)
- Email/SMS Notifications
- Document Uploads & Digital Waivers

### Locations & Resources
- Multi-location support
- Ability to configure hours per location
- Service provider assignment per location
- Reservation filtering by location

### Transactions
- Payment history & invoice generation
- Stripe transaction sync
- View and refund capabilities

### Reporting
- Service Provider reports (activity, sales, clients)
- Manager dashboards (revenue, schedule, usage)
- Export CSV / Excel

### Recurring Appointments
- Define weekly/daily recurring slots
- Ability to override single instances

### Smart Availability
- Conditional availability (by appointment type, day, etc.)
- Custom scheduling rules

### Multi-Tenant / Org Control
- Calendar Node ownership (Manager owns a space)
- Create/assign Service Providers
- Allow tiered roles / permissions per node
- Scoped access to resources & data

### Mobile Experience
- Responsive web-first
- Optionally wrap with Capacitor/React Native

---

## Bonus Ideas (Future Enhancements)
- Waitlists
- Resource pooling (e.g., 10 massage chairs shared across services)
- Review/rating system for providers
- In-app chat or messaging
- Provider time-off/vacation tracking
- Promo codes or discounts
- AI scheduling assistant

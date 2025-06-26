# Scheduling Application – MVP & Feature Roadmap

## MVP Scope

**Goal**: Deploy a working scheduling platform where users can log in, manage their calendar, and book/reserve services.

### 1. Authentication & Roles

* Self-registration path for Clients
* Clients can be created by Providers or register independently
* No email verification required (word-of-mouth clients)
* Optional merging system to reconcile provider-created vs. client-registered accounts
* Cookie-based login system (ASP.NET Core Identity)
* Roles: Manager, Service Provider, Client
* Role admin can assign/revoke roles

### 2. Calendar Functionality

* User-friendly error handling for booking failures (e.g., no availability, expired packages)
* Conflict detection:

  * Warn but allow double-booking for providers (to aid with appointment swaps)
  * Block overlapping bookings for clients, with helpful error message
* Time zone display included beneath calendar times (e.g., '8:00AM (7:00AM Client's Time Zone)')
* React SPA with DayPilot integration
* Day, Week, Month, and Resource views
* Users can define availability
* Users can view/book/cancel appointments
* Prevent double-bookings

**Reservations link to:**

* Guest Name
* Date/Time
* Reservation Type
* (Optional) Reservation Length
* (Optional) Location

### 3. Appointment & Reservation Types

* Managers can create, edit, and delete appointment types
* Service Providers can create and manage their own appointment types
* Clients can view and select from available appointment types
* Appointment types may include duration, location, price, and waiver requirements
* Track reservation history per user

### 4. Packages

* Auto-decrementing package system
* Globally defined by Managers or Providers
* Tied to specific `AppointmentType` (e.g., 10 1hr massages)
* Can be assigned to users/clients
* Service Providers define quantity, appointment type, and optional expiration date
* Basic validation when out of sessions

### Suggested `Package` Model

```csharp
public class Package
{
    public int Id { get; set; }
    public string Name { get; set; }
    public int TotalSessions { get; set; }
    public int RemainingSessions { get; set; }
    public DateTime? ExpirationDate { get; set; }

    public string AppointmentTypeId { get; set; }
    public string CreatedByUserId { get; set; }
    public List<UserPackageAssignment> AssignedUsers { get; set; }
}

public class UserPackageAssignment
{
    public int Id { get; set; }
    public string UserId { get; set; }
    public int PackageId { get; set; }
    public int RemainingSessions { get; set; }
    public DateTime? ExpirationDate { get; set; }
}
```

### 5. Reservation Model

#### Key Concepts

* A reservation is an instance of a booked `AppointmentType` at a scheduled `DateTime`
* Linked to a `Client` and a `Service Provider`
* Optional: tied to a package session (for decrementing)

#### Suggested `Reservation` Model

```csharp
public class Reservation
{
    public int Id { get; set; }

    public string ClientId { get; set; }
    public string ServiceProviderId { get; set; }

    public int AppointmentTypeId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }

    public string? LocationId { get; set; }
    public int? PackageAssignmentId { get; set; }

    public ReservationStatus Status { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public enum ReservationStatus
{
    Booked,
    Completed,
    Canceled,
    NoShow
}
```

### Availability Validation

* Location Capacity Enforcement:

  * Check number of existing reservations at the location and time
  * Compare against `MaxConcurrentReservations`
* Validate against `AvailabilitySlot`:

  * Provider match
  * Time window match
  * Location and type match if set

### Package + Reservation Behavior

* On booking: match a package, decrement sessions
* On cancel:

  * Auto-restore if >24h in advance
  * Else, provider decides
* Only one active package per appointment type
* New package refreshes existing one (e.g., 4/12 → 16/12)

---

### 5. Permissions Model

#### Reservation & History Visibility

| Role     | Visibility          |
| -------- | ------------------- |
| Client   | Own only            |
| Provider | Own + Resource view |
| Manager  | All                 |

#### Audit Logs

* Log actions: create, cancel, edit
* Store timestamps and user who performed action

### Role-Based Permissions Summary

| Role     | Can View Others’ Appointments? | Permissions             |
| -------- | ------------------------------ | ----------------------- |
| Manager  | Yes                            | Full access             |
| Provider | Limited (Resource View)        | Own data and scheduling |
| Client   | No                             | Own bookings only       |

---

### Filtering & View Logic (Future Enhancement Outline)

#### Default View Behavior

* Client: own only
* Provider: own + shared resource
* Manager: all

#### Future Filter Options

* By Provider, Location, Type, Date, Status
* Search by client or notes
* Visible to Manager, optionally Provider
* Reset button

#### Backend Filtering Logic

* Apply authorization scope first
* Parse query params (e.g., `?providerId=&locationId=&status=Booked`)
* Build filtered LINQ query in repository
* Return paged result with meta (total count, filters used)

#### Frontend UX Filtering Mockup

* Dropdowns: Provider, Location, Appointment Type, Status
* Date range picker
* Search input (Client Name/Notes)
* Show filter chips (e.g., `Status: Booked ×`)
* Reset/Clear all button

---

### 6. Backend API

**Models:**

* ApplicationUser
* Reservation
* AppointmentType
* Package
* Location
* AvailabilitySlot
* Endpoints secured with role-based auth

### 6. UI Components

* Login Page
* Calendar Component
* Booking Component
* Availability Setup
* Client View
* Roles Admin

### 7. Admin Capabilities

* Role & user management
* Assign providers to calendars

### 8. Infrastructure

* Frontend: React + DayPilot
* Backend: ASP.NET Core 8
* DB: EF Core with migrations
* Testing & Debugging Suite (Unit Tests)

---

## Post-MVP / Full Feature Roadmap

### Core Enhancements

* Audit Trail System

  * Dedicated table to log entity changes (Reservation, Availability, AppointmentType)
  * Includes: EntityType, EntityId, ActionType, PerformedBy, Timestamp, and JSON snapshot

* Soft Deletes

  * Models like Reservation and Package use `IsDeleted` flag instead of permanent deletion

* Tagging System

  * Allow Managers/Providers to tag Reservations or Clients (e.g., VIP, Trial)
  * Tags support future filtering and scheduling logic

* Schedule Templates

  * Let providers create reusable weekly availability blueprints

* Client Merge Queue

  * Detect potential duplicates and allow manual merge by Managers

* Rate Limits / Abuse Protection

  * Protect public/self-booking endpoints with IP/account rate limits

* Calendar Sync Resilience

  * Cache external calendar data locally
  * Provide reconnect flows for Google/iCal accounts

* Document Versioning

  * Store version history of waivers and associate with signed copy

* Activity Feed / Dashboard Widget

  * Recent events (new bookings, cancellations, etc.) displayed per user role

* Dark Mode Toggle

  * Optional UI polish

* Audit Timeline UI

  * GitHub-style commit log for reservation history

* Google Calendar & Apple Calendar Integration

  * Allow clients and providers to sync appointments to personal calendars
  * Support for iCal and Google API event creation/deletion

* Email/SMS Notifications

  * Triggers: reservation creation, cancel, edit
  * Roles receive relevant alerts
  * Manager sets preferences
  * Optional: 24h reminders

* External Auth

* Payment Integration

* Document Uploads/Waivers

### Locations & Resources

* Multi-location support
* Custom hours and capacity
* Assign providers to locations
* Filtering support

### Transactions

* Stripe sync
* Payment history & refunds

### Reporting

* Provider and Manager dashboards
* Export support

### Recurring Appointments

* Weekly/daily series
* Edit/cancel one or all
* Calendar preview

### Smart Availability

* Conditional by type/day
* Custom rules

### Multi-Tenant

* Calendar node ownership
* Scoped roles and resources

### Mobile

* Responsive first
* Capacitor/React Native wrap

---

## Bonus Ideas

* Waitlists
* Resource pooling
* Ratings
* In-app messaging
* Vacation tracking
* Promo codes
* AI scheduling

---

## Appointment Type Ownership & Permissions

| Role     | Manage Own Types? | See Others’?      | Edit Others’? |
| -------- | ----------------- | ----------------- | ------------- |
| Manager  | Yes               | Yes               | Yes           |
| Provider | Yes               | No                | No            |
| Client   | No                | Yes (public only) | No            |

### `AppointmentType` Model

```csharp
public class AppointmentType
{
    public int Id { get; set; }
    public string Name { get; set; }
    public TimeSpan Duration { get; set; }
    public decimal? Price { get; set; }
    public string? Description { get; set; }

    public string CreatedByUserId { get; set; }
    public string? AssignedLocationId { get; set; }

    public bool IsPublic { get; set; }
    public bool RequiresWaiver { get; set; }
}
```

---

## Availability Model

### Unified Model

```csharp
public class AvailabilitySlot
{
    public int Id { get; set; }
    public string ServiceProviderId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public DateTime? SpecificDate { get; set; }
    public string? LocationId { get; set; }
    public string? AppointmentTypeId { get; set; }
    public bool IsActive { get; set; }
}
```

Supports both recurring and one-off availability. Conditional logic allows matching by type, location, and overrides.

---

## Visual Roadmap

![Logical Order of Work](sandbox:/mnt/data/A_flowchart_image_depicts_the_logical_order_of_wor.png)

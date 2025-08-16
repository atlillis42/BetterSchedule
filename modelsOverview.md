# Domain Models Overview

## AppointmentType
Represents a type of service offered.
- **Key Fields:** `Name`, `Duration`, `Price`, `Description`, `IsPublic`, `RequiresWaiver`.
- **Relationships:** Created by an `ApplicationUser`; may reference a default `CalendarResource`; belongs to an `Organization`.

## CalendarResource
Resource that can host reservations (e.g., room or equipment).
- **Key Fields:** `Name`, `BackColor`.
- **Relationships:** Belongs to an `Organization`; has many `BlockedTime` entries.

## BlockedTime
Time range when a resource or provider is unavailable.
- **Key Fields:** `Reason`, `StartTime`, `EndTime`, `BackColor`.
- **Relationships:** Optional link to a `CalendarResource`; created by an `ApplicationUser`; belongs to an `Organization`.

## Reservation
Booking between a client and service provider for an appointment type.
- **Key Fields:** `StartTime`, `EndTime`, `Status`, `Notes`.
- **Relationships:** References a `Client` and `ServiceProvider` (`ApplicationUser`), an `AppointmentType`, optional `CalendarResource`, and an `Organization`; may have multiple `ReservationParticipant` records.

## ReservationParticipant
Associates additional users with a reservation.
- **Key Fields:** `UserId`, `Role` (`Client`, `ServiceProvider`, `Guest`).
- **Relationships:** Belongs to a `Reservation` and an `Organization`.

## ApplicationUser
Represents users of the system, including managers, service providers, and clients.
- **Relationships:** Linked to reservations, appointment types, and blocked times through their respective `CreatedBy` or participant fields.
# Backend Authorization Scopes

This document summarizes scope helper classes in `BetterSchedule.Server/Auth`. These extensions limit queries to an organization and enforce role-based access in the backend.

## AppointmentTypeScopes
- `VisibleTo` restricts appointment types to those in the organization and not deleted. Managers see all; providers see public types or ones they created; clients see only public types.
- `CanModify` lets managers edit any type, providers edit their own, and clients never modify.

## BlockedTimeScopes
- `VisibleTo` allows managers and providers to see blocked times in the organization; other roles see none.
- `Overlapping` optionally narrows results to entries overlapping a start/end window.
- `CanModify` grants modification to managers for any entry and to providers for entries they created.

## OrganizationScopes
- `InOrganization` filters any `IOrganizationOwned` model to a specific organization and excludes deleted rows.

## ReservationScopes
- `VisibleTo` filters reservations by organization and role. Managers see all; providers see those where they are the service provider; clients see their own.
- `Overlapping` filters reservations overlapping a specified time range.
- `CanModify` mirrors `VisibleTo` for write access.

### Sample Usage
```csharp
// Reservations visible to current user within a time window
var reservations = _context.Reservations
    .VisibleTo(orgId, userId, isManager, isProvider, isClient)
    .Overlapping(start, end)
    .ToList();

// Blocked times for providers/managers overlapping a window
var blocks = _context.BlockedTimes
    .VisibleTo(orgId, isManager, isProvider)
    .Overlapping(start, end)
    .ToList();
```
# Event Modal

The event modal drives reservation and blocked-time entry on the calendar. It switches between two form layouts and performs client lookups and validation before sending data to the server.

## Type Toggle

A two-button **TypeToggle** lets users choose between **Reservation** and **Blocked Time**. The toggle is disabled when editing an existing entry so the original type cannot change. The selected type determines which form fields appear.

## Reservation Fields

When **Reservation** is active, the modal includes:

- **Client search** – an async dropdown to search clients.
- **Event name**.
- **Appointment type ID** (numeric).
- **Provider selector** – chooses a service provider.
- **Resource selector** – chooses a calendar resource.
- **Start/end date and time**.
- **Notes** for additional details.

## Blocked Time Fields

When **Blocked Time** is active, the modal shows a trimmed form:

- **Reason** for the block.
- **Resource selector**.
- **Start/end date and time**.

Provider and client inputs are hidden for blocked time entries.

## Async Client Lookup

The client field uses `AsyncSelect` with a debounced loader. Every 250 ms of idle typing triggers a lookup via `searchClients`. The loader aborts any in-flight request before issuing a new one and returns empty results on error.

## Provider and Resource Selectors

Both form types receive provider and resource lists from the parent component. Reservations display **Provider** and **Resource** dropdowns, while blocked time shows only **Resource**.

## Validation and Errors

Submission flows through `Calendar.tsx`:

1. `validateReservation` or `validateBlockedTime` runs to ensure required fields and chronological times.
2. Any validation message is stored as `modalFormError` and rendered in the modal.
3. Server failures surface inline when the API throws a message; other HTTP errors trigger toast notifications.
4. The `error` prop appears at the bottom of the modal for user feedback.

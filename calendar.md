# Calendar Views and Modal Flow

BetterSchedule's React calendar wraps DayPilot Lite to provide several switchable views and a modal-driven event flow. This document outlines the available views and the logic behind selecting or editing events.

## DayPilot Views

The calendar supports four view modes, each backed by a DayPilot component:

| View      | Component            | Notes |
|-----------|----------------------|-------|
| **Day**   | `DayPilotCalendar` with `viewType="Day"` | Single-day agenda. |
| **Week**  | `DayPilotCalendar` with `viewType="Week"` | Default mode showing a seven‑day grid. |
| **Month** | `DayPilotMonth`      | Compact monthly overview. |
| **Resources** | `DayPilotScheduler` | Five‑day resource scheduler. |

Toolbar buttons switch between these modes and a `DayPilotNavigator` in the sidebar drives the starting date.

## Selecting and Editing Events

`Calendar.tsx` listens for user interactions from DayPilot and opens `EventModal` when needed.

### Creating a Reservation
- `onTimeRangeSelected` runs when a user drags to select a time range.
- If the user lacks reservation privileges, the selection is ignored.
- Otherwise the selection is converted into initial modal values and the Create Reservation form opens.

### Viewing or Editing Existing Items
- `onEventClick` determines whether the clicked item is a reservation or blocked time.
- Edit mode is enabled only if the user has permission; otherwise the modal opens in read‑only mode.
- Upon save, sends an Update call on the event to the API

After a successful save or delete, events are reloaded for the currently visible range.

## Permission Checks

Two role‑based flags guard actions:

- `canManageReservations` – managers and providers may create, edit, or remove reservations.
- `canManageBlocks` – managers and providers may create, edit, or remove blocked times. Providers may only modify their own blocked times.

These flags are enforced before opening the modal, when submitting, and when deleting to ensure unauthorized users cannot change data.

## Usage Examples

The file [`betterschedule.client/src/__tests__/Calendar.test.tsx`](../../betterschedule.client/src/__tests__/Calendar.test.tsx) contains Vitest suites that mock DayPilot and exercise the modal workflow, including validation and API calls. Refer to those tests for practical examples of selecting time ranges and handling modal results.

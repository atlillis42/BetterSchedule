import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

/* ------------------------------------------------------------------
   Mock DayPilot before the component is imported
------------------------------------------------------------------ */
vi.mock("@daypilot/daypilot-lite-react", () => {
    // Minimal FakeDate & stubbed React wrappers – only what Calendar uses
    class FakeDate {
        private d: Date;
        constructor(date: Date = new Date()) {
            this.d = date;
        }
        static today() {
            return new FakeDate();
        }
        addHours(h: number) {
            return new FakeDate(new Date(this.d.getTime() + h * 3_600_000));
        }
        addDays(d: number) {
            return new FakeDate(new Date(this.d.getTime() + d * 86_400_000));
        }
        toString() {
            return this.d.toISOString();
        }
    }

    const Stub = (testId: string) => (props: any) => (
        <div data-testid={testId} data-props={JSON.stringify(props)} />
    );

    return {
        DayPilot: { Date: FakeDate },
        DayPilotCalendar: Stub("daypilot-calendar"),
        DayPilotMonth: Stub("daypilot-month"),
        DayPilotNavigator: Stub("daypilot-navigator"),
        DayPilotScheduler: Stub("daypilot-scheduler"),
    };
});

/* ------------------------------------------------------------------
   Mock calendar API helpers – path must match component import
------------------------------------------------------------------ */
vi.mock("@/api/calendar", () => ({
    getResources: vi.fn().mockResolvedValue([
        { id: "R1", name: "Main Arena" },
    ]),
    getEvents: vi.fn().mockResolvedValue([
        {
            id: 1,
            text: "Stub event",
            start: "2025-01-01T09:00:00Z",
            end: "2025-01-01T10:00:00Z",
            resource: "R1",
        },
    ]),
}));

/* ------------------------------------------------------------------
   Import Calendar AFTER mocks so stubs are applied
------------------------------------------------------------------ */
import Calendar from "@/components/calendar/Calendar";

/* -------------------- Tests -------------------- */
describe("Calendar component", () => {
    test("renders loader then resources & events (Week → Resources)", async () => {
        render(<Calendar />); // defaults to Week view

        // Confirm stub calendar node mounts (initial paint may still be empty)
        const cal = await screen.findByTestId("daypilot-calendar");
        expect(cal).toBeInTheDocument();

        // Wait until events array populated in Week view
        await waitFor(() => {
            const props = JSON.parse(cal.getAttribute("data-props")!);
            if (!props.events?.length) throw new Error("events still loading");
            expect(props.events.length).toBeGreaterThan(0);
            expect(props.viewType).toBe("Week");
        });

        // Switch to Resources view via toolbar button click
        fireEvent.click(screen.getByRole("button", { name: /resources/i }));

        // Wait until the Scheduler stub appears with resources loaded
        await waitFor(() => {
            const scheduler = screen.getByTestId("daypilot-scheduler");
            const sProps = JSON.parse(scheduler.getAttribute("data-props")!);
            if (!sProps.resources?.length) throw new Error("resources still loading");

            expect(sProps.resources.length).toBeGreaterThan(0);
            expect(sProps.events.length).toBeGreaterThan(0);
            // viewType is not present on Scheduler stub, so no assertion here
        });
    });
});




// TODO: when real GET /api/calendar/resources is wired-up,
//       mock the API call and assert that the stub receives the
//       transformed data (e.g. names, ids).

// TODO: verify that switching views (“Day” → “Week” → “Month”)
//       unmounts the previous DayPilot component and mounts the correct one
//       with matching startDate / events props.

// TODO: assert that changing the navigator date triggers
//       a refetch (mocked) and updates the calendar startDate.

// TODO: once onTimeRangeSelected creates events via API,
//       mock POST /api/calendar/events, click-drag to create range,
//       confirm event appears, then ensure refresh with server-id.

// TODO: add regression test for “weekday + date” header formatter
//       (verify Monday & short date render for any given ISO date).

// TODO: test error-boundary path – mock getEvents to throw
//       and ensure the fallback UI (toast / banner) appears but dummy
//       data stay visible.
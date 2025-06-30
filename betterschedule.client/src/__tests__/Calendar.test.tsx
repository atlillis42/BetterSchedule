import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

/* ------------------------------------------------------------------
    Mock DayPilot before the component is imported
   ------------------------------------------------------------------ */
vi.mock("@daypilot/daypilot-lite-react", () => {
    // Minimal clone of DayPilot.Date
    class FakeDate {
        private d: Date;
        constructor(date: Date = new Date()) {
            this.d = date;
        }
        static today() {
            return new FakeDate();
        }
        addHours(hours: number) {
            return new FakeDate(
                new Date(this.d.getTime() + hours * 3_600_000)
            );
        }
        addDays(days: number) {
            return new FakeDate(
                new Date(this.d.getTime() + days * 86_400_000)
            );
        }
        /** DayPilot converts to string → supply ISO 8601 */
        toString() {
            return this.d.toISOString();
        }
    }

    /* Dumb React placeholders – enough for RTL to query by data-testids */
    const Stub =
        (testId: string) =>
            (props: any) =>
                <div data-testid={testId} data-props={JSON.stringify(props)} />;

    return {
        DayPilot: { Date: FakeDate },
        DayPilotCalendar: Stub("daypilot-calendar"),
        DayPilotMonth: Stub("daypilot-month"),
        DayPilotNavigator: Stub("daypilot-navigator"),
        DayPilotScheduler: Stub("daypilot-scheduler"),
    };
});

/* ------------------------------------------------------------------
   import Calendar component that uses DayPilot
   ------------------------------------------------------------------ */
import Calendar from "@/components/calendar/Calendar";

/* --------------------Tests-----------------*/
describe("Calendar component", () => {
    test("renders loader then resources & events", async () => {
        render(<Calendar />);

        // first render happens almost instantly because stub is synchronous
        const cal = await screen.findByTestId("daypilot-calendar");
        expect(cal).toBeInTheDocument();

        // resources/events dummy arrays are set in a useEffect → wait for them
        await waitFor(() => {
            const props = JSON.parse(
                screen.getByTestId("daypilot-calendar").getAttribute("data-props")!
            );
            expect(props.events.length).toBeGreaterThan(0);
            expect(props.attributes["data-testid"]).toBe("daypilot-calendar");
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
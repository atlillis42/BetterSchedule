import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Calendar from "@/components/calendar/Calendar";

/* ----------- DayPilot Mock with Modal and Handler Exposure ----------- */
vi.mock("@daypilot/daypilot-lite-react", () => {
    class FakeDate {
        private d: Date;
        constructor(date: Date = new Date()) { this.d = date; }
        static today() { return new FakeDate(); }
        addHours(h: number) { return new FakeDate(new Date(this.d.getTime() + h * 3_600_000)); }
        addDays(d: number) { return new FakeDate(new Date(this.d.getTime() + d * 86_400_000)); }
        toString() { return this.d.toISOString(); }
        firstDayOfWeek(startOn: number = 0) {
            const date = new Date(this.d);
            const day = date.getDay();
            const diff = (day < startOn ? 7 : 0) + day - startOn;
            date.setDate(date.getDate() - diff);
            date.setHours(0, 0, 0, 0);
            return new FakeDate(date);
        }
        firstDayOfMonth() {
            const date = new Date(this.d);
            date.setDate(1);
            date.setHours(0, 0, 0, 0);
            return new FakeDate(date);
        }
    }

    (globalThis as any).modalFormMock = vi.fn();
    (globalThis as any).testCalendarHandlers = {};

    const Stub = (testId: string) => (props: any) => {
        if (testId === "daypilot-calendar") {
            (globalThis as any).testCalendarHandlers.onTimeRangeSelected = props.onTimeRangeSelected;
            (globalThis as any).testCalendarHandlers.onEventClick = props.onEventClick;
        }
        return <div data-testid={testId} data-props={JSON.stringify(props)} />;
    };

    return {
        DayPilot: {
            Date: FakeDate,
            Modal: { form: (...args: any[]) => (globalThis as any).modalFormMock(...args) }
        },
        DayPilotCalendar: Stub("daypilot-calendar"),
        DayPilotMonth: Stub("daypilot-month"),
        DayPilotNavigator: Stub("daypilot-navigator"),
        DayPilotScheduler: Stub("daypilot-scheduler"),
    };
});

/* ------------------ API Mock ------------------ */
import * as calendarApi from "@/api/calendar-api";
vi.mock("@/api/calendar-api", () => ({
    getResources: vi.fn(),
    getEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
}));

/* ------------------ Test Suite ------------------ */
describe("Calendar (DayPilot modal-driven event flow)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis as any).modalFormMock.mockReset();
        (globalThis as any).testCalendarHandlers = {};
    });

    /* ---------- CREATE ---------- */
    test("event creation: invalid time triggers validation, does not call createEvent", async () => {
        (calendarApi.getResources as any).mockResolvedValue([{ id: 1, name: "Room" }]);
        (calendarApi.getEvents as any).mockResolvedValue([]);

        // Simulate invalid (end before start), then cancel
        (globalThis as any).modalFormMock
            .mockResolvedValueOnce({
                canceled: false,
                result: {
                    text: "Test Event",
                    startDate: "2025-01-01",
                    startTime: "10:00",
                    endDate: "2025-01-01",
                    endTime: "09:00", // End before start
                }
            })
            .mockResolvedValueOnce({ canceled: true }); // User cancels after validation message

        render(<Calendar />);
        await screen.findByTestId("daypilot-calendar");

        const { onTimeRangeSelected } = (globalThis as any).testCalendarHandlers;
        expect(typeof onTimeRangeSelected).toBe("function");

        await onTimeRangeSelected({
            start: new Date("2025-01-01T10:00:00Z"),
            end: new Date("2025-01-01T09:00:00Z"),
            control: { clearSelection: vi.fn() },
            resource: 1,
        });

        expect(calendarApi.createEvent).not.toHaveBeenCalled();
    });

    test("event creation: missing name triggers validation, does not call createEvent", async () => {
        (calendarApi.getResources as any).mockResolvedValue([{ id: 1, name: "Room" }]);
        (calendarApi.getEvents as any).mockResolvedValue([]);
        // Simulate missing text
        (globalThis as any).modalFormMock
            .mockResolvedValueOnce({
                canceled: false,
                result: {
                    text: "",
                    startDate: "2025-01-01",
                    startTime: "09:00",
                    endDate: "2025-01-01",
                    endTime: "10:00",
                }
            })
            .mockResolvedValueOnce({ canceled: true }); // User cancels after validation

        render(<Calendar />);
        await screen.findByTestId("daypilot-calendar");
        const { onTimeRangeSelected } = (globalThis as any).testCalendarHandlers;

        await onTimeRangeSelected({
            start: new Date("2025-01-01T09:00:00Z"),
            end: new Date("2025-01-01T10:00:00Z"),
            control: { clearSelection: vi.fn() },
            resource: 1,
        });

        expect(calendarApi.createEvent).not.toHaveBeenCalled();
    });

    test("event creation: missing date triggers validation, does not call createEvent", async () => {
        (calendarApi.getResources as any).mockResolvedValue([{ id: 1, name: "Room" }]);
        (calendarApi.getEvents as any).mockResolvedValue([]);

        // Simulate missing startDate
        (globalThis as any).modalFormMock
            .mockResolvedValueOnce({
                canceled: false,
                result: {
                    text: "Missing Date",
                    startDate: "",
                    startTime: "09:00",
                    endDate: "2025-01-01",
                    endTime: "10:00",
                }
            })
            .mockResolvedValueOnce({ canceled: true });

        render(<Calendar />);
        await screen.findByTestId("daypilot-calendar");
        const { onTimeRangeSelected } = (globalThis as any).testCalendarHandlers;

        await onTimeRangeSelected({
            start: new Date("2025-01-01T09:00:00Z"),
            end: new Date("2025-01-01T10:00:00Z"),
            control: { clearSelection: vi.fn() },
            resource: 1,
        });

        expect(calendarApi.createEvent).not.toHaveBeenCalled();
    });

    test("event creation: invalid time format triggers validation, does not call createEvent", async () => {
        (calendarApi.getResources as any).mockResolvedValue([{ id: 1, name: "Room" }]);
        (calendarApi.getEvents as any).mockResolvedValue([]);

        // Simulate invalid time format
        (globalThis as any).modalFormMock
            .mockResolvedValueOnce({
                canceled: false,
                result: {
                    text: "Bad Time",
                    startDate: "2025-01-01",
                    startTime: "badtime",
                    endDate: "2025-01-01",
                    endTime: "10:00",
                }
            })
            .mockResolvedValueOnce({ canceled: true });

        render(<Calendar />);
        await screen.findByTestId("daypilot-calendar");
        const { onTimeRangeSelected } = (globalThis as any).testCalendarHandlers;

        await onTimeRangeSelected({
            start: new Date("2025-01-01T09:00:00Z"),
            end: new Date("2025-01-01T10:00:00Z"),
            control: { clearSelection: vi.fn() },
            resource: 1,
        });

        expect(calendarApi.createEvent).not.toHaveBeenCalled();
    });

    test("event creation: modal cancel does not call createEvent", async () => {
        (calendarApi.getResources as any).mockResolvedValue([{ id: 1, name: "Room" }]);
        (calendarApi.getEvents as any).mockResolvedValue([]);
        (globalThis as any).modalFormMock.mockResolvedValueOnce({ canceled: true });

        render(<Calendar />);
        await screen.findByTestId("daypilot-calendar");
        const { onTimeRangeSelected } = (globalThis as any).testCalendarHandlers;

        await onTimeRangeSelected({
            start: new Date("2025-01-01T09:00:00Z"),
            end: new Date("2025-01-01T10:00:00Z"),
            control: { clearSelection: vi.fn() },
            resource: 1,
        });

        expect(calendarApi.createEvent).not.toHaveBeenCalled();
    });

    test("event creation: valid modal submission calls createEvent and triggers UI refresh", async () => {
        (calendarApi.getResources as any).mockResolvedValue([{ id: 1, name: "Room" }]);
        (calendarApi.getEvents as any)
            .mockResolvedValueOnce([]) // initial
            .mockResolvedValueOnce([
                {
                    id: 2,
                    text: "New Event",
                    startUtc: "2025-01-01T09:00:00Z",
                    endUtc: "2025-01-01T10:00:00Z",
                    resourceId: 1,
                }
            ]);
        (calendarApi.createEvent as any).mockResolvedValue({
            id: 2,
            text: "New Event",
            startUtc: "2025-01-01T09:00:00Z",
            endUtc: "2025-01-01T10:00:00Z",
            resourceId: 1,
        });

        (globalThis as any).modalFormMock.mockResolvedValueOnce({
            canceled: false,
            result: {
                text: "New Event",
                startDate: "2025-01-01",
                startTime: "09:00",
                endDate: "2025-01-01",
                endTime: "10:00",
                resourceId: 1,
            }
        });

        render(<Calendar />);
        await screen.findByTestId("daypilot-calendar");
        const { onTimeRangeSelected } = (globalThis as any).testCalendarHandlers;

        await onTimeRangeSelected({
            start: new Date("2025-01-01T09:00:00Z"),
            end: new Date("2025-01-01T10:00:00Z"),
            control: { clearSelection: vi.fn() },
            resource: 1,
        });

        expect(calendarApi.createEvent).toHaveBeenCalledWith({
            text: "New Event",
            startUtc: expect.any(String),
            endUtc: expect.any(String),
            resourceId: 1,
            backColor: "#fca5a5"
        });
        // UI refresh: check for new event in event-titles list
        await waitFor(() => {
            expect(screen.getByTestId("calendar-event-titles")).toHaveTextContent("New Event");
        });
    });

    /* ---------- UPDATE ---------- */
    test("event editing: valid edit triggers updateEvent and refreshes UI", async () => {
        (calendarApi.getResources as any).mockResolvedValue([{ id: 1, name: "Room" }]);
        (calendarApi.getEvents as any)
            .mockResolvedValueOnce([
                {
                    id: 3,
                    text: "Edit Me",
                    startUtc: "2025-01-02T13:00:00Z",
                    endUtc: "2025-01-02T14:00:00Z",
                    resourceId: 1,
                }
            ])
            .mockResolvedValueOnce([
                {
                    id: 3,
                    text: "Updated Event",
                    startUtc: "2025-01-02T13:00:00Z",
                    endUtc: "2025-01-02T14:00:00Z",
                    resourceId: 1,
                }
            ]);
        (calendarApi.updateEvent as any).mockResolvedValue({});

        (globalThis as any).modalFormMock.mockResolvedValueOnce({
            canceled: false,
            result: {
                text: "Updated Event",
                startDate: "2025-01-02",
                startTime: "13:00",
                endDate: "2025-01-02",
                endTime: "14:00",
                resourceId: 1,
            }
        });

        render(<Calendar />);
        await screen.findByTestId("daypilot-calendar");
        const { onEventClick } = (globalThis as any).testCalendarHandlers;

        await onEventClick({
            e: {
                id: () => 3,
                text: () => "Edit Me",
                start: () => "2025-01-02T13:00:00Z",
                end: () => "2025-01-02T14:00:00Z",
                resource: () => 1,
                backColor: "#fca5a5"
            }
        });

        expect(calendarApi.updateEvent).toHaveBeenCalledWith(3, expect.objectContaining({
            text: "Updated Event"
        }));

        // UI refresh: check for new event in event-titles list
        await waitFor(() => {
            expect(screen.getByTestId("calendar-event-titles")).toHaveTextContent("Updated Event");
        });
    });

    test("event editing: modal cancel does not call updateEvent", async () => {
        (calendarApi.getResources as any).mockResolvedValue([{ id: 1, name: "Room" }]);
        (calendarApi.getEvents as any).mockResolvedValue([
            {
                id: 7,
                text: "Edit Test",
                startUtc: "2025-01-07T10:00:00Z",
                endUtc: "2025-01-07T11:00:00Z",
                resourceId: 1,
            }
        ]);

        (globalThis as any).modalFormMock.mockResolvedValueOnce({ canceled: true });

        render(<Calendar />);
        await screen.findByTestId("daypilot-calendar");

        const { onEventClick } = (globalThis as any).testCalendarHandlers;
        expect(typeof onEventClick).toBe("function");

        await onEventClick({
            e: {
                id: () => 7,
                text: () => "Edit Test",
                start: () => "2025-01-07T10:00:00Z",
                end: () => "2025-01-07T11:00:00Z",
                resource: () => 1,
                backColor: "#fca5a5"
            }
        });

        expect(calendarApi.updateEvent).not.toHaveBeenCalled();
    });

    /* ---------- DELETE ---------- */
    test("event editing: checking delete calls deleteEvent and updates UI", async () => {
        (calendarApi.getResources as any).mockResolvedValue([{ id: 1, name: "Room" }]);
        (calendarApi.getEvents as any)
            .mockResolvedValueOnce([
                {
                    id: 5,
                    text: "Delete Me",
                    startUtc: "2025-01-05T13:00:00Z",
                    endUtc: "2025-01-05T14:00:00Z",
                    resourceId: 1,
                }
            ])
            .mockResolvedValueOnce([]); // After deletion

        (calendarApi.deleteEvent as any).mockResolvedValue({});

        (globalThis as any).modalFormMock.mockResolvedValueOnce({
            canceled: false,
            result: {
                text: "Delete Me",
                startDate: "2025-01-05",
                startTime: "13:00",
                endDate: "2025-01-05",
                endTime: "14:00",
                resourceId: 1,
                delete: true,
            }
        });

        render(<Calendar />);
        await screen.findByTestId("daypilot-calendar");

        const { onEventClick } = (globalThis as any).testCalendarHandlers;
        expect(typeof onEventClick).toBe("function");

        await onEventClick({
            e: {
                id: () => 5,
                text: () => "Delete Me",
                start: () => "2025-01-05T13:00:00Z",
                end: () => "2025-01-05T14:00:00Z",
                resource: () => 1,
                backColor: "#fca5a5"
            }
        });

        expect(calendarApi.deleteEvent).toHaveBeenCalledWith(5);
        await waitFor(() => {
            expect(screen.getByTestId("calendar-event-titles")).not.toHaveTextContent("Delete Me");
        });
    });

    /* ---------- API/NETWORK ERRORS ---------- */
    test("getEvents API failure triggers fallback logic", async () => {
        (calendarApi.getResources as any).mockResolvedValue([{ id: 1, name: "Room" }]);
        (calendarApi.getEvents as any).mockRejectedValue(new Error("API failure"));

        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });

        render(<Calendar />);
        await waitFor(() => {
            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Calendar API fetch failed"),
                expect.any(Error)
            );
        });

        errorSpy.mockRestore();
    });

    test("event creation: API 400 (bad resource) surfaces error", async () => {
        (calendarApi.getResources as any).mockResolvedValue([{ id: 1, name: "Room" }]);
        (calendarApi.getEvents as any).mockResolvedValue([]);
        (calendarApi.createEvent as any).mockRejectedValue({
            response: { status: 400, data: { message: "Resource not found" } }
        });

        (globalThis as any).modalFormMock
            .mockResolvedValueOnce({
                canceled: false,
                result: {
                    text: "Test Event",
                    startDate: "2025-01-01",
                    startTime: "09:00",
                    endDate: "2025-01-01",
                    endTime: "10:00",
                    resourceId: 999,
                }
            })
            .mockResolvedValueOnce({ canceled: true });

        render(<Calendar />);
        await screen.findByTestId("daypilot-calendar");

        const { onTimeRangeSelected } = (globalThis as any).testCalendarHandlers;
        expect(typeof onTimeRangeSelected).toBe("function");

        await onTimeRangeSelected({
            start: new Date("2025-01-01T09:00:00Z"),
            end: new Date("2025-01-01T10:00:00Z"),
            control: { clearSelection: vi.fn() },
            resource: 999,
        });

        expect(calendarApi.createEvent).toHaveBeenCalled();
    });

    /* ---------- VIEW SWITCHING/REFRESH ---------- */
    test("switching between Day/Week/Month views fetches correct events", async () => {
        (calendarApi.getResources as any).mockResolvedValue([{ id: 1, name: "Room" }]);
        (calendarApi.getEvents as any)
            .mockResolvedValueOnce([{ id: 1, text: "Week Event", startUtc: "2025-01-01T09:00:00Z", endUtc: "2025-01-01T10:00:00Z", resourceId: 1 }])
            .mockResolvedValueOnce([{ id: 2, text: "Day Event", startUtc: "2025-01-02T12:00:00Z", endUtc: "2025-01-02T13:00:00Z", resourceId: 1 }])
            .mockResolvedValueOnce([{ id: 3, text: "Month Event", startUtc: "2025-01-03T15:00:00Z", endUtc: "2025-01-03T16:00:00Z", resourceId: 1 }]);

        render(<Calendar />);

        // Default: Week view
        await waitFor(() => {
            const list = screen.getByTestId("calendar-event-titles");
            expect(list).toHaveTextContent("Week Event");
        });

        // Switch to Day
        screen.getByRole("button", { name: /^day$/i }).click();
        await waitFor(() => {
            const list = screen.getByTestId("calendar-event-titles");
            expect(list).toHaveTextContent("Day Event");
        });

        // Switch to Month
        screen.getByRole("button", { name: /^month$/i }).click();
        await waitFor(() => {
            const list = screen.getByTestId("calendar-event-titles");
            expect(list).toHaveTextContent("Month Event");
        });
    });
});

import { useEffect, useState } from "react";
import {
    DayPilot,
    DayPilotCalendar,
    DayPilotMonth,
    DayPilotNavigator,
    DayPilotScheduler
} from "@daypilot/daypilot-lite-react";
import { getResources, getEvents, createEvent } from "@api/calendar-api";
import type {
    CalendarTimeRangeSelectedArgs,
} from "@/types/daypilotTypes";
import type { CalendarEvent, CalendarResource } from "@/types/calendarDataTypes";
import "@styles/Calendar.css";
import { formatWeekHeader } from "./CalendarUtilities";

// ----------- Window Calculation Utility -------------
function getVisibleRange(
    startDate: DayPilot.Date,
    view: "Day" | "Week" | "Month" | "Resources"
) {
    if (view === "Day") {
        return { start: startDate, end: startDate.addDays(1) };
    }
    if (view === "Week") {
        // Week starts on Sunday. Change to (1) for Monday.
        const weekStart = startDate.firstDayOfWeek(0);
        return { start: weekStart, end: weekStart.addDays(7) };
    }
    if (view === "Month") {
        const firstOfMonth = startDate.firstDayOfMonth();
        const gridStart = firstOfMonth.firstDayOfWeek(0);
        return { start: gridStart, end: gridStart.addDays(42) };
    }
    return { start: startDate, end: startDate.addDays(1) };
}

// ---------------------------------------------------

const Calendar = () => {
    const [view, setView] = useState<"Day" | "Week" | "Month" | "Resources">("Week");
    const [startDate, setStartDate] = useState(DayPilot.Date.today());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [resources, setResources] = useState<CalendarResource[]>([]);

    const onTimeRangeSelected = async (args: CalendarTimeRangeSelectedArgs) => {
        const dp = args.control;
        const resourceOptions = resources.map((r) => ({
            name: r.name,
            id: r.id
        }));

        const selectedResourceId =
            view === "Resources" && args.resource
                ? Number(args.resource)
                : resourceOptions[0]?.id ?? undefined;

        const form = [
            { name: "Event Name", id: "text", type: "text" },
            {
                name: "Resource",
                id: "resourceId",
                type: "select",
                options: [
                    { name: "(None)", id: "" },
                    ...resourceOptions.map((r) => ({
                        name: r.name,
                        id: r.id
                    }))
                ],
                value: selectedResourceId
            }
        ];

        const modal = await DayPilot.Modal.form(form, {
            text: "",
            resourceId: selectedResourceId
        });

        dp.clearSelection();
        if (modal.canceled || !modal.result || !modal.result.text) return;

        const resourceId =
            modal.result.resourceId === "" || modal.result.resourceId === undefined
                ? undefined
                : Number(modal.result.resourceId);

        const payload = {
            text: modal.result.text,
            startUtc: args.start.toString(),
            endUtc: args.end.toString(),
            resourceId,
            backColor: "#fca5a5"
        };

        try {
            await createEvent(payload);
            // Always refetch for current window after creation
            const { start, end } = getVisibleRange(startDate, view);
            const freshEvents = await getEvents(start, end);
            setEvents(freshEvents);
        } catch (err) {
            console.error("Failed to create event:", err);
            alert("Error creating event");
        }
    };

    useEffect(() => {
        (async () => {
            try {
                const { start, end } = getVisibleRange(startDate, view);
                const [realResources, realEvents] = await Promise.all([
                    getResources(),
                    getEvents(start, end)
                ]);
                if (realResources.length) setResources(realResources);
                if (realEvents.length) setEvents(realEvents);
            } catch (err) {
                console.error("⛔ Calendar API fetch failed – falling back to demo data", err);
            }
        })();
    }, [startDate, view]);

    useEffect(() => {
        console.log("Resources:", resources);
        console.log("Events:", events);
    }, [resources, events]);

    const getNavigatorMode = () => (view === "Month" ? "Month" : "Day");

    return (
        <div className="calendar-container w-full h-full flex flex-row overflow-hidden">
            <div className="calendar-sidebar w-64 bg-white shadow-md border-r border-gray-200">
                <DayPilotNavigator
                    theme="betterschedule_navigator"
                    selectMode={getNavigatorMode()}
                    showMonths={3}
                    skipMonths={3}
                    onTimeRangeSelected={(args) => setStartDate(args.day)}
                    events={events}
                />
            </div>

            <div className="calendar-main flex flex-col flex-1 min-w-0">
                <div className="calendar-toolbar flex gap-2 p-2 border-b bg-gray-100">
                    <button onClick={() => setView("Day")} className={view === "Day" ? "selected" : ""}>
                        Day
                    </button>
                    <button onClick={() => setView("Week")} className={view === "Week" ? "selected" : ""}>
                        Week
                    </button>
                    <button onClick={() => setView("Month")} className={view === "Month" ? "selected" : ""}>
                        Month
                    </button>
                    <button onClick={() => setView("Resources")} className={view === "Resources" ? "selected" : ""}>
                        Resources
                    </button>
                    <button onClick={() => setStartDate(DayPilot.Date.today())} className="standalone">
                        Today
                    </button>
                </div>

                <div className="calendar-body flex-1 overflow-auto">
                    {view === "Day" && (
                        <DayPilotCalendar
                            viewType="Day"
                            theme="betterschedule"
                            startDate={startDate}
                            events={events}
                            durationBarVisible={false}
                            onTimeRangeSelected={onTimeRangeSelected}
                            headerHeight={40}
                            onBeforeHeaderRender={(args) => {
                                const { weekday, short } = formatWeekHeader(args.header.start);
                                args.header.html = `
                                <div style="display:flex;flex-direction:column;align-items:center;line-height:1.2">
                                  <span style="font-weight:600">${weekday}</span>
                                  <span style="font-size:12px">${short}</span>
                                </div>`;
                            }}
                        />
                    )}

                    {view === "Week" && (
                        <DayPilotCalendar
                            viewType="Week"
                            theme="betterschedule"
                            startDate={startDate}
                            events={events}
                            durationBarVisible={false}
                            onTimeRangeSelected={onTimeRangeSelected}
                            headerHeight={40}
                            onBeforeHeaderRender={(args) => {
                                const { weekday, short } = formatWeekHeader(args.header.start);
                                args.header.html = `
                                <div style="display:flex;flex-direction:column;align-items:center;line-height:1.2">
                                  <span style="font-weight:600">${weekday}</span>
                                  <span style="font-size:12px">${short}</span>
                                </div>`;
                            }}
                        />
                    )}

                    {view === "Month" && (
                        <div className="month-wrapper">
                            <DayPilotMonth
                                startDate={startDate}
                                theme="monthlybetterschedule"
                                events={events}
                                eventBarVisible={false}
                                onTimeRangeSelected={onTimeRangeSelected}
                            />
                        </div>
                    )}

                    {view === "Resources" && (
                        <DayPilotScheduler
                            startDate={startDate}
                            days={5} //TODO: Make this dynamic based on user selection
                            scale="Hour"
                            timeHeaders={[
                                { groupBy: "Day", format: "dddd MMM d" },
                                { groupBy: "Hour" }
                            ]}
                            resources={resources}
                            events={events}
                            cellWidth={50}
                            headerHeight={30}
                            rowHeaderWidth={150}
                            durationBarVisible={false}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Calendar;

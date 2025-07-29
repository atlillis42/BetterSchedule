import { useEffect, useState } from "react";
import {
    DayPilot,
    DayPilotCalendar,
    DayPilotMonth,
    DayPilotNavigator,
    DayPilotScheduler
} from "@daypilot/daypilot-lite-react";
import {
    getResources,
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent
} from "@api/calendar-api";
import type {
    CalendarTimeRangeSelectedArgs,
} from "@/types/daypilotTypes";
import type { ApiEvent, UiEvent, CalendarResource } from "@/types/calendarDataTypes";
import "@styles/Calendar.css";
import { formatWeekHeader, eventModalFields, getVisibleRange, buildEventApiDto, combineDateTime, extractEventFields, getLocalDateString, getLocalTimeString, toUiEvent } from "./CalendarUtilities";


const Calendar = () => {
    const [view, setView] = useState<"Day" | "Week" | "Month" | "Resources">("Week");
    const [startDate, setStartDate] = useState(DayPilot.Date.today());
    const [events, setEvents] = useState<UiEvent[]>([]);
    const [resources, setResources] = useState<CalendarResource[]>([]);

    const onTimeRangeSelected = async (args: CalendarTimeRangeSelectedArgs) => {
        const dp = args.control;
        let formError = "";

        const startDate = getLocalDateString(args.start);
        const startTime = getLocalTimeString(args.start);
        const endDate = getLocalDateString(args.end);
        const endTime = getLocalTimeString(args.end);

        while (true) {
            const form = eventModalFields({
                resources,
                includeDelete: false,
                values: {
                    startDate,
                    startTime,
                    endDate,
                    endTime,
                    resourceId: args.resource ?? resources[0]?.id ?? "",
                    formError
                }
            });

            const modal = await DayPilot.Modal.form(form, {
                startDate,
                startTime,
                endDate,
                endTime,
                resourceId: args.resource ?? resources[0]?.id ?? "",
            });

            dp.clearSelection();
            if (modal.canceled || !modal.result || !modal.result.text) return;

            // Always use combineDateTime for robust ISO string construction
            const startCheck = combineDateTime(modal.result.startDate, modal.result.startTime);
            const endCheck = combineDateTime(modal.result.endDate, modal.result.endTime);

            if (!startCheck.iso) {
                formError = startCheck.errorMsg || "Invalid start date/time.";
                continue;
            }
            if (!endCheck.iso) {
                formError = endCheck.errorMsg || "Invalid end date/time.";
                continue;
            }
            if (new Date(endCheck.iso) <= new Date(startCheck.iso)) {
                formError = "End time must be after start time.";
                continue;
            }

            const resourceId =
                modal.result.resourceId === "" || modal.result.resourceId === undefined
                    ? undefined
                    : Number(modal.result.resourceId);

            const payload = {
                text: modal.result.text,
                startUtc: startCheck.iso,
                endUtc: endCheck.iso,
                resourceId,
                backColor: "#fca5a5", // Default color for new events
            };

            try {
                await createEvent(payload);
                // Always refetch for current window after creation
                const { start, end } = getVisibleRange(
                    new DayPilot.Date(modal.result.startDate), // always pass DayPilot.Date!
                    view
                );
                const freshEvents = await getEvents(start, end);
                setEvents(freshEvents.map(toUiEvent));
            } catch (err) {
                console.error("Failed to create event:", err);
                alert("Error creating event");
            }
            break;
        }
    };
    
    const onEventClick = async (args: any) => {
        // Universal extractor to handle DayPilot, backend, or 3rd-party event shapes
        const {
            id,
            text,
            startDate,
            startTime,
            endDate,
            endTime,
            resourceId,
            backColor,
        } = extractEventFields(args.e);

        if (!startDate || !endDate) {
            alert("Event is missing start or end time and cannot be edited.");
            return;
        }

        let formError = "";

        while (true) {
            const form = eventModalFields({
                resources,
                includeDelete: true,
                values: {
                    text,
                    startDate,
                    startTime,
                    endDate,
                    endTime,
                    resourceId: resourceId ?? "",
                    formError,
                    delete: false,
                }
            });

            const modal = await DayPilot.Modal.form(form, {
                text,
                startDate,
                startTime,
                endDate,
                endTime,
                resourceId: resourceId ?? "",
                delete: false,
            });

            if (modal.canceled) return;

            // Handle delete: always allowed, skip validation
            if (modal.result.delete) {
                await deleteEvent(id);
                break;
            }

            // Use DTO builder for API payload (always validates date/time)
            let payload;
            try {
                payload = buildEventApiDto({
                    baseEvent: args.e.data ?? args.e,
                    formValues: modal.result,
                });
                payload.backColor = backColor; // Preserve color if unchanged
            } catch (e) {
                formError = (e as Error).message || "Error preparing event data.";
                continue;
            }

            await updateEvent(id, payload);
            break; // Successfully updated, exit modal loop
        }

        // Refresh event list after update/delete
        const { start: rangeStart, end: rangeEnd } = getVisibleRange(new DayPilot.Date(startDate), view);
        const freshEvents = await getEvents(rangeStart, rangeEnd);
        setEvents(freshEvents.map(toUiEvent));
    };


    useEffect(() => {
        (async () => {
            try {
                const { start, end } = getVisibleRange(startDate, view);
                const [realResources, rawEvents] = await Promise.all([
                    getResources(),
                    getEvents(start, end)
                ]);
                if (realResources.length) setResources(realResources);
                if (rawEvents.length)
                    setEvents(rawEvents.map(toUiEvent));
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
        <>
            {process.env.NODE_ENV === "test" && (
                <ul data-testid="calendar-event-titles" style={{ display: "none" }}>
                    {events.map(e => <li key={e.id}>{e.text}</li>)}
                </ul>
            )}

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
                                onEventClick={onEventClick}
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
                                onEventClick={onEventClick}
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
                                    onEventClick={onEventClick}
                                />
                            </div>
                        )}

                        {view === "Resources" && (
                            <DayPilotScheduler
                                startDate={startDate}
                                days={5}
                                scale="Hour"
                                timeHeaders={[
                                    { groupBy: "Day", format: "dddd MMM d" },
                                    { groupBy: "Hour" }
                                ]}
                                resources={resources}
                                events={events}
                                onEventClick={onEventClick}
                                cellWidth={50}
                                headerHeight={30}
                                rowHeaderWidth={150}
                                durationBarVisible={false}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};


export default Calendar;

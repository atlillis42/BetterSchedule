import { useEffect, useState } from 'react';
import {
    DayPilot,
    DayPilotCalendar,
    DayPilotMonth,
    DayPilotNavigator,
    DayPilotScheduler
} from '@daypilot/daypilot-lite-react';
import { getResources, getEvents } from "@/api/calendar-api";
import '@styles/Calendar.css';
import { formatWeekHeader } from "./CalendarUtilities"



const Calendar = () => {
    const [view, setView] = useState<'Day' | 'Week' | 'Month' | 'Resources'>('Week');
    const [startDate, setStartDate] = useState(DayPilot.Date.today());
    const [events, setEvents] = useState([]);
    const [resources, setResources] = useState([]);

    const onTimeRangeSelected = async (args: any) => {
        const dp = args.control;
        const modal = await DayPilot.Modal.prompt('Create a new event:', 'Event Name');
        dp.clearSelection();
        if (modal.canceled) return;
        const newEvent = {
            start: args.start,
            end: args.end,
            text: modal.result,
        };
        setEvents(prev => [...prev, newEvent]);
    };

    // -----------------------------------------------------
    //  Attempt to fetch real data *after* seeding dummy
    // -----------------------------------------------------
    useEffect(() => {
        (async () => {
            try {
                // Trys to pull actual calendar resources and events
                const [realResources, realEvents] = await Promise.all([
                       getResources(),
                       getEvents(startDate, view),   // ✔️ matches helper signature
                     ]);

                // If either call returns an empty array, keep what was already displayed.
                if (realResources.length) setResources(realResources);
                if (realEvents.length) setEvents(realEvents);
            } catch (err) {
                // Won't blow up the UI – just logs and keep dummy data visible
                console.error("⛔ Calendar API fetch failed – falling back to demo data", err);
            }
        })();
    }, [startDate, view]);   // ← refetch when user changes date or view

    useEffect(() => {
        console.log("Resources:", resources);
        console.log("Events:", events);
    }, [resources, events]); 

    const getNavigatorMode = () => (
        view === 'Month' ? 'Month' : 'Day');

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
                    <button onClick={() => setView('Day')} className={view === 'Day' ? 'selected' : ''}>
                        Day
                    </button>
                    <button onClick={() => setView('Week')} className={view === 'Week' ? 'selected' : ''}>
                        Week
                    </button>
                    <button onClick={() => setView('Month')} className={view === 'Month' ? 'selected' : ''}>
                        Month
                    </button>
                    <button onClick={() => setView('Resources')} className={view === 'Resources' ? 'selected' : ''}>
                        Resources
                    </button>
                    <button onClick={() => setStartDate(DayPilot.Date.today())} className="standalone">
                        Today
                    </button>
                </div>

                <div className="calendar-body flex-1 overflow-auto">
                    {view === 'Day' && (
                        <DayPilotCalendar
                            viewType="Day"
                            theme="betterschedule"
                            attributes={{ "data-testid": "daypilot-calendar" }}
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

                    {view === 'Week' && (
                        <DayPilotCalendar
                            viewType="Week"
                            theme="betterschedule"
                            attributes={{ "data-testid": "daypilot-calendar" }}
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

                    {view === 'Month' && (
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

                    {view === 'Resources' && (
                        <DayPilotScheduler
                            startDate={startDate}
                            days={5} //TODO: Make this dynamic based on user selection
                            scale="Hour" //backendUrl="/api/scheduler"
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
                            //theme="betterschedule"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Calendar;

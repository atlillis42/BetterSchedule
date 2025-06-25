import { useEffect, useState } from 'react';
import {
    DayPilot,
    DayPilotCalendar,
    DayPilotMonth,
    DayPilotNavigator,
    DayPilotScheduler
} from '@daypilot/daypilot-lite-react';
import '../styling/Calendar.css';



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

    useEffect(() => {
        setResources([
            { name: "Main Arena", id: "R1" },
            { name: "Secondary Arena", id: "R2" },
            { name: "Training Room", id: "R3" },
            { name: "Conference Room", id: "R4" },
            { name: "VIP Lounge", id: "R5" },
        ]);

        const demoEvents = [
                    { id: 1, text: "Event 1", start: DayPilot.Date.today().addHours(9), end: DayPilot.Date.today().addHours(11), resource: "R1" },
                    { id: 2, text: "Event 2", start: DayPilot.Date.today().addHours(10), end: DayPilot.Date.today().addHours(12), backColor: "#93c47d", resource: "R2" },
                    { id: 3, text: "Event 3", start: DayPilot.Date.today().addDays(1).addHours(9), end: DayPilot.Date.today().addDays(1).addHours(11), backColor: "#ffd966", resource: "R3" },
                    { id: 4, text: "Event 4", start: DayPilot.Date.today().addDays(1).addHours(11.5), end: DayPilot.Date.today().addDays(1).addHours(13.5), backColor: "#f6b26b", resource: "R4" },
                    { id: 5, text: "Event 5", start: DayPilot.Date.today().addDays(4).addHours(9), end: DayPilot.Date.today().addDays(4).addHours(11), backColor: "#8e7cc3", resource:"R5" },
                    { id: 6, text: "Event 6", start: DayPilot.Date.today().addDays(4).addHours(13), end: DayPilot.Date.today().addDays(4).addHours(15), backColor: "#6fa8dc", resource: "R1" },
                ];               
        setEvents(demoEvents);    
    }, []);

    useEffect(() => {
        console.log("Resources:", resources);
        console.log("Events:", events);
    }, [resources, events]);

    const getNavigatorMode = () => (
        view === 'Month' ? 'Month' : 'Day');

    return (
        <div className="calendar-container">
            <div className="calendar-sidebar">
                <DayPilotNavigator
                    selectMode={getNavigatorMode()}
                    showMonths={3}
                    skipMonths={3}
                    onTimeRangeSelected={(args) => setStartDate(args.day)}
                    events={events}
                />
            </div>

            <div className="calendar-main">
                <div className="calendar-toolbar">
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

                <div className="calendar-body">
                    {view === 'Day' && (
                        <DayPilotCalendar
                            viewType="Day"
                            theme="betterschedule"
                            startDate={startDate}
                            events={events}
                            durationBarVisible={false}
                            onTimeRangeSelected={onTimeRangeSelected}
                        />
                    )}

                    {view === 'Week' && (
                        <DayPilotCalendar
                            viewType="Week"
                            theme="betterschedule"
                            startDate={startDate}
                            events={events}
                            durationBarVisible={false}
                            onTimeRangeSelected={onTimeRangeSelected}
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

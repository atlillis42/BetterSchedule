//import { DayPilot, DayPilotCalendar, DayPilotMonth, DayPilotNavigator } from "@daypilot/daypilot-lite-react";
//import { useEffect, useRef, useState } from 'react';
//import { useMonthResize } from '../hooks/useMonthResize';
//import "../styling/Calendar.css";
//import "../styling/monthlybetterschedule.css";

//const Calendar = () => {
//    const [view, setView] = useState("Week");
//    const [startDate, setStartDate] = useState(DayPilot.Date.today());
//    const [events, setEvents] = useState([]);
//    const containerRef = useRef<HTMLDivElement>(null);

//    useMonthResize(containerRef);

//    const onTimeRangeSelected = async (args) => {
//        const dp = args.control;
//        const modal = await DayPilot.Modal.prompt("Create a new event:", "Event Name");
//        dp.clearSelection();
//        if (modal.canceled) return;
//        const e = { start: args.start, end: args.end, text: modal.result };
//        setEvents([...events, e]);
//    };

//    useEffect(() => {
//        const data = [
//            { id: 1, text: "Event 1", start: DayPilot.Date.today().addHours(9), end: DayPilot.Date.today().addHours(11) },
//            { id: 2, text: "Event 2", start: DayPilot.Date.today().addHours(10), end: DayPilot.Date.today().addHours(12), backColor: "#93c47d" },
//            { id: 3, text: "Event 3", start: DayPilot.Date.today().addDays(1).addHours(9), end: DayPilot.Date.today().addDays(1).addHours(11), backColor: "#ffd966" },
//            { id: 4, text: "Event 4", start: DayPilot.Date.today().addDays(1).addHours(11.5), end: DayPilot.Date.today().addDays(1).addHours(13.5), backColor: "#f6b26b" },
//            { id: 5, text: "Event 5", start: DayPilot.Date.today().addDays(4).addHours(9), end: DayPilot.Date.today().addDays(4).addHours(11), backColor: "#8e7cc3" },
//            { id: 6, text: "Event 6", start: DayPilot.Date.today().addDays(4).addHours(13), end: DayPilot.Date.today().addDays(4).addHours(15), backColor: "#6fa8dc" },
//        ];
//        setEvents(data);
//    }, []);

//    return (
//        <div className="container" ref={containerRef}>
//            <div className="navigator">
//                <DayPilotNavigator
//                    selectMode={view}
//                    showMonths={3}
//                    skipMonths={3}
//                    onTimeRangeSelected={args => setStartDate(args.day)}
//                    events={events}
//                />
//            </div>
//            <div className="content">
//                <div className="toolbar">
//                    <div className="toolbar-group">
//                        <button onClick={() => setView("Day")} className={view === "Day" ? "selected" : ""}>Day</button>
//                        <button onClick={() => setView("Week")} className={view === "Week" ? "selected" : ""}>Week</button>
//                        <button onClick={() => setView("Month")} className={view === "Month" ? "selected" : ""}>Month</button>
//                    </div>
//                    <button onClick={() => setStartDate(DayPilot.Date.today())} className="standalone">Today</button>
//                </div>

//                <DayPilotCalendar
//                    viewType="Day"
//                    theme="betterschedule"
//                    startDate={startDate}
//                    events={events}
//                    visible={view === "Day"}
//                    durationBarVisible={false}
//                    onTimeRangeSelected={onTimeRangeSelected}
//                />

//                <DayPilotCalendar
//                    viewType="Week"
//                    theme="betterschedule"
//                    startDate={startDate}
//                    events={events}
//                    visible={view === "Week"}
//                    durationBarVisible={false}
//                    onTimeRangeSelected={onTimeRangeSelected}
//                />

//                <div className="month-wrapper" style={{ width: '100%', height: '600px' }}>
//                    <DayPilotMonth
//                        startDate={startDate}
//                        theme="monthlybetterschedule"
//                        events={events}
//                        visible={view === "Month"}
//                        eventBarVisible={false}
//                        onTimeRangeSelected={onTimeRangeSelected}
//                    />
//                </div>
//            </div>
//        </div>
//    );
//};

//export default Calendar;


// Calendar.tsx
import { useEffect, useState } from 'react';
import {
    DayPilot,
    DayPilotCalendar,
    DayPilotMonth,
    DayPilotNavigator,
} from '@daypilot/daypilot-lite-react';
import '../styling/Calendar.css';



const Calendar = () => {
    const [view, setView] = useState<'Day' | 'Week' | 'Month'>('Week');
    const [startDate, setStartDate] = useState(DayPilot.Date.today());
    const [events, setEvents] = useState([]);

    const onTimeRangeSelected = async (args: any) => {
        const dp = args.control;
        const modal = await DayPilot.Modal.prompt('Create a new event:', 'Event Name');
        dp.clearSelection();
        if (modal.canceled) return;
        const e = {
            start: args.start,
            end: args.end,
            text: modal.result,
        };
        setEvents([...events, e]);
    };

    useEffect(() => {
        const data = [
                    { id: 1, text: "Event 1", start: DayPilot.Date.today().addHours(9), end: DayPilot.Date.today().addHours(11) },
                    { id: 2, text: "Event 2", start: DayPilot.Date.today().addHours(10), end: DayPilot.Date.today().addHours(12), backColor: "#93c47d" },
                    { id: 3, text: "Event 3", start: DayPilot.Date.today().addDays(1).addHours(9), end: DayPilot.Date.today().addDays(1).addHours(11), backColor: "#ffd966" },
                    { id: 4, text: "Event 4", start: DayPilot.Date.today().addDays(1).addHours(11.5), end: DayPilot.Date.today().addDays(1).addHours(13.5), backColor: "#f6b26b" },
                    { id: 5, text: "Event 5", start: DayPilot.Date.today().addDays(4).addHours(9), end: DayPilot.Date.today().addDays(4).addHours(11), backColor: "#8e7cc3" },
                    { id: 6, text: "Event 6", start: DayPilot.Date.today().addDays(4).addHours(13), end: DayPilot.Date.today().addDays(4).addHours(15), backColor: "#6fa8dc" },
                ];               
        setEvents(data);
    }, []);

    return (
        <div className="calendar-container">
            <div className="calendar-sidebar">
                <DayPilotNavigator
                    selectMode={view}
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
                </div>
            </div>
        </div>
    );
};

export default Calendar;

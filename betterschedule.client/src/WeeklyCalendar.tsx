import React, { useEffect, useRef, useState } from 'react';
import { DayPilot, DayPilotCalendar, DayPilotNavigator } from "@daypilot/daypilot-lite-react";
import "./WeeklyCalendar.css";

const styles = {
    wrap: {
        display: "flex"
    },
    left: {
        marginRight: "10px"
    },
    main: {
        flexGrow: "1"
    }
};

const Calendar = () => {
    const calendarRef = useRef<any>(null);
    const [startDate, setStartDate] = useState(new Date());
    const [events, setEvents] = useState([]);

    const config = {
        viewType: "Week",
        durationBarVisible: true,
        timeRangeSelectedHandling: "Enabled",

        onTimeRangeSelected: async (args: { start: any; end: any; }) => {
            const modal = await DayPilot.Modal.prompt("Create a new event:", "Event 1");
            calendarRef.current.clearSelection();
            if (!modal.result) { return; }
            calendarRef.current.events.add({
                start: args.start,
                end: args.end,
                id: DayPilot.guid(),
                text: modal.result
            });
        },
        onEventClick: async (args: { e: any; }) => {
            await editEvent(args.e);
        },
        contextMenu: new DayPilot.Menu({
            items: [
                {
                    text: "Delete",
                    onClick: async args => {
                        calendarRef.current.events.remove(args.source);
                    },
                },
                {
                    text: "-"
                },
                {
                    text: "Edit...",
                    onClick: async args => {
                        await editEvent(args.source);
                    }
                }
            ]
        }),
        onBeforeEventRender: (args: { data: { areas: { bottom: number; right: number; width: number; height: number; action: string; image: string; style: string; }[] | ({ top: number; right: number; width: number; height: number; symbol: string; fontColor: string; toolTip: string; action: string; onClick?: undefined; } | { top: number; right: number; width: number; height: number; symbol: string; fontColor: string; action: string; toolTip: string; onClick: (args: { source: any; }) => Promise<void>; })[]; participants: any; }; }) => {
            args.data.areas = [
                {
                    top: 3,
                    right: 3,
                    width: 20,
                    height: 20,
                    symbol: "icons/daypilot.svg#minichevron-down-2",
                    fontColor: "#fff",
                    toolTip: "Show context menu", // TODO: Can use this to have more detailed hover tooltip in future
                    action: "ContextMenu",
                },
                {
                    top: 3,
                    right: 25,
                    width: 20,
                    height: 20,
                    symbol: "icons/daypilot.svg#x-circle",
                    fontColor: "#fff",
                    action: "None",
                    toolTip: "Delete event",
                    onClick: async (args: { source: any }) => {
                        calendarRef.current.events.remove(args.source);
                    }
                }
            ];


            // TODO: Update this to match logged in user
            const participants = args.data.participants;
            if (participants > 0) {
                for (let i = 0; i < participants; i++) {
                    args.data.areas.push({
                        bottom: 5,
                        right: 5 + i * 30,
                        width: 24,
                        height: 24,
                        action: "None",
                        image: `https://picsum.photos/24/24?random=${i}`,
                        style: "border-radius: 50%; border: 2px solid #fff; overflow: hidden;",
                    });
                }
            }
        }
    };

    function addHours(date: string | number | Date, hours: number) {
        const result = new Date(date);
        result.setHours(result.getHours() + hours);
        return result;
    }

    const editEvent = async (e: { text: () => string | undefined; data: { text: any; }; }) => {
        const modal = await DayPilot.Modal.prompt("Update event text:", e.text());
        if (!modal.result) { return; }
        e.data.text = modal.result;
        calendarRef.current.events.update(e);
    };


    // TODO: Add a way to fetch events from the server (Dummy data for now)
    // TODO: Add selection of backColor for events
    useEffect(() => {
        const now = new Date();
        const events = [
            {
                id: 1,
                text: "Event 1",
                start: now,
                end: addHours(now, 3),
                participants: 2
            },
            {
                id: 2,
                text: "Event 2",
                start: now,
                end: addHours(now, 1),
                backColor: "#6aa84f",
                participants: 1,
            },
        ];
        setEvents(events);
    }, []);

    const handleTimeRangeSelected = (args: { day: React.SetStateAction<Date>; }) => {
        setStartDate(args.day);
    };

    return (
        <div style={styles.wrap}>
            <div style={styles.left}>
                <DayPilotNavigator
                    //TODO : Allow selectMode to be set dynamically (or decide to keep separate components for each mode)
                    selectMode={"Week"}
                    showMonths={2}
                    skipMonths={2}
                    selectionDay={startDate}
                    onTimeRangeSelected={handleTimeRangeSelected}
                />
            </div>
            <div style={styles.main}>
                <DayPilotCalendar
                    {...config}
                    startDate={startDate}
                    events={events}
                    controlRef={calendarRef}
                />
            </div>
        </div>
    );
};

export default Calendar;
 
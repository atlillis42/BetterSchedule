// #region Imports & Type Setup
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
    DayPilot,
    DayPilotCalendar,
    DayPilotMonth,
    DayPilotNavigator,
    DayPilotScheduler
} from "@daypilot/daypilot-lite-react";

import {
    getResources
} from "@/api/calendar-resource-api";
import {
    getBlockedTimes,
    createBlockedTime,
    updateBlockedTime,
    deleteBlockedTime
} from "@/api/blockedtime-api";
import {
    getReservations,
    createReservation,
    updateReservation,
    deleteReservation
} from "@/api/reservation-api";

import EventModal from "@/components/modals/EventModal";
import { formatWeekHeader } from "@/utilities/calendarDisplay/formatWeekHeader";
import { getVisibleRange } from "@/utilities/calendarDisplay/getVisibleRange";
import { getLocalDateString, getLocalTimeString, combineDateTime } from "@/utilities/conversions/dateParsing";
import { extractEventFields } from "@/utilities/legacy/extractEventFields";
import { blockedTimeToUiEvent } from "@/utilities/mapping/blockedTimeToUiEvent";
import { reservationToUiEvent } from "@/utilities/mapping/reservationToUiEvent";
import { validateReservation, validateBlockedTime } from "@/utilities/formFields";

import "@styles/Calendar.css";
import type { CalendarResource, UiEvent } from "@/types/calendarDataTypes";
import type { CalendarTimeRangeSelectedArgs } from "@/types/daypilotTypes";
// #endregion

// #region Fetch All Events
async function fetchAllEvents(
    startDate: DayPilot.Date,
    endDate: DayPilot.Date
): Promise<UiEvent[]> {
    const [blockedTimes, reservations] = await Promise.all([
        getBlockedTimes({ start: startDate.toString("yyyy-MM-dd"), end: endDate.toString("yyyy-MM-dd") }),
        getReservations({ start: startDate.toString("yyyy-MM-dd"), end: endDate.toString("yyyy-MM-dd") })
    ]);
    const blockedEvents = blockedTimes.map(blockedTimeToUiEvent);
    const reservationEvents = reservations.map(reservationToUiEvent);
    return [...blockedEvents, ...reservationEvents];
}
// #endregion

const Calendar = () => {
    // #region State
    const [view, setView] = useState<"Day" | "Week" | "Month" | "Resources">("Week");
    const [startDate, setStartDate] = useState(DayPilot.Date.today());
    const [events, setEvents] = useState<UiEvent[]>([]);
    const [resources, setResources] = useState<CalendarResource[]>([]);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [modalType, setModalType] = useState<"reservation" | "blockedTime">("reservation");
    const [modalValues, setModalValues] = useState<any>({});
    const [modalFormError, setModalFormError] = useState<string | null>(null);
    // #endregion

    // #region onTimeRangeSelected (Create)
    const onTimeRangeSelected = (args: CalendarTimeRangeSelectedArgs) => {
        setModalType("reservation");
        setModalMode("create");
        setModalValues({
            startDate: getLocalDateString(args.start),
            startTime: getLocalTimeString(args.start),
            endDate: getLocalDateString(args.end),
            endTime: getLocalTimeString(args.end),
            resourceId: args.resource ?? resources[0]?.id ?? "",
            serviceProviderId: args.resource ?? resources[0]?.id ?? "",
            type: "reservation"
        });
        setShowModal(true);
        setModalFormError(null);
    };
    // #endregion

    // #region onEventClick (Edit/Delete)
    const onEventClick = (args: any) => {
        setModalMode("edit");
        setModalType(args.e.type || "reservation");
        setModalValues({
            ...extractEventFields(args.e),
            id: args.e.id,
            type: args.e.type || "reservation",
        });
        setShowModal(true);
        setModalFormError(null);
    };
    // #endregion

    // #region Modal Submission Handler
    const handleModalSubmit = async () => {
        // Validate before API call
        let validationError: string | null = null;
        if (modalType === "reservation") {
            validationError = validateReservation(modalValues);
        } else {
            validationError = validateBlockedTime(modalValues);
        }
        if (validationError) {
            setModalFormError(validationError);
            return;
        }

        // Guarantee start/end as strings
        const start = combineDateTime(modalValues.startDate, modalValues.startTime).iso as string;
        const end = combineDateTime(modalValues.endDate, modalValues.endTime).iso as string;

            try {
                if (modalMode === "edit") {
                    if (modalType === "reservation") {
                        await updateReservation(modalValues.id, {
                            clientId: modalValues.clientId,
                            serviceProviderId: modalValues.serviceProviderId,
                            appointmentTypeId: Number(modalValues.appointmentTypeId) || 1,
                            startTime: start,
                            endTime: end,
                            notes: modalValues.notes ?? "",
                        });
                        toast.success("Reservation updated!");
                    } else {
                        await updateBlockedTime(modalValues.id, {
                            resourceId: modalValues.resourceId,
                            startTime: start,
                            endTime: end,
                            reason: modalValues.reason ?? "",
                        });
                        toast.success("Blocked time updated!");
                    }
                } else {
                    if (modalType === "reservation") {
                        await createReservation({
                            clientId: modalValues.clientId,
                            serviceProviderId: modalValues.serviceProviderId,
                            appointmentTypeId: Number(modalValues.appointmentTypeId) || 1,
                            startTime: start,
                            endTime: end,
                            notes: modalValues.notes ?? "",
                        });
                        toast.success("Reservation created!");
                    } else {
                        await createBlockedTime({
                            resourceId: modalValues.resourceId,
                            startTime: start,
                            endTime: end,
                            reason: modalValues.reason ?? "",
                        });
                        toast.success("Blocked time created!");
                    }
                }
                setShowModal(false);

                // Refetch events
                const { start: fetchStart, end: fetchEnd } = getVisibleRange(new DayPilot.Date(modalValues.startDate), view);
                const allEvents = await fetchAllEvents(fetchStart, fetchEnd);
                setEvents(allEvents);

            } catch {
                // fallback error toast
                toast.error("Something went wrong. Please try again.");
            }
        };
    

    const handleModalDelete = async () => {
        if (modalType === "reservation") {
            await deleteReservation(modalValues.id);
        } else {
            await deleteBlockedTime(modalValues.id);
        }
        setShowModal(false);

        // Refetch events after delete
        const { start: fetchStart, end: fetchEnd } = getVisibleRange(new DayPilot.Date(modalValues.startDate), view);
        const allEvents = await fetchAllEvents(fetchStart, fetchEnd);
        setEvents(allEvents);
    };
    // #endregion

    // #region Effect: Initial Load
    useEffect(() => {
        (async () => {
            try {
                const { start, end } = getVisibleRange(startDate, view);
                const [realResources, allEvents] = await Promise.all([
                    getResources(),
                    fetchAllEvents(start, end)
                ]);
                if (realResources.length) setResources(realResources);
                setEvents(allEvents);
            } catch (err) {
                console.error("⛔ Calendar API fetch failed – falling back to demo data", err);
            }
        })();
    }, [startDate, view]);
    // #endregion

    // #region Render
    return (
        <>
            <EventModal
                open={showModal}
                mode={modalMode}
                type={modalType}
                setType={setModalType}
                values={modalValues}
                setValues={setModalValues}
                onSubmit={handleModalSubmit}
                onDelete={modalMode === "edit" ? handleModalDelete : undefined}
                onCancel={() => setShowModal(false)}
                error={modalFormError}
                resources={resources}
            />
            <div className="calendar-container w-full h-full flex flex-row overflow-hidden">
                <div className="calendar-sidebar w-64 bg-white shadow-md border-r border-gray-200">
                    <DayPilotNavigator
                        theme="betterschedule_navigator"
                        selectMode={view === "Month" ? "Month" : "Day"}
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
    // #endregion
};

export default Calendar;

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { DayPilot, DayPilotCalendar, DayPilotMonth, DayPilotNavigator, DayPilotScheduler } from "@daypilot/daypilot-lite-react";

import { getResources } from "@/api/calendar-resource-api";
import { getBlockedTimes, createBlockedTime, updateBlockedTime, deleteBlockedTime } from "@/api/blockedtime-api";
import { getReservations, createReservation, updateReservation, deleteReservation } from "@/api/reservation-api";
import { getProvidersLite } from "@/api/user-api";

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
import { useAuth } from "@auth/AuthContext";
import { isManager, isProvider } from "@auth/roles";

type ProviderLite = { id: string; name: string };

async function fetchAllEvents(startDate: DayPilot.Date, endDate: DayPilot.Date): Promise<UiEvent[]> {
    const [blockedTimes, reservations] = await Promise.all([
        getBlockedTimes({ start: startDate.toString("yyyy-MM-dd"), end: endDate.toString("yyyy-MM-dd") }),
        getReservations({ start: startDate.toString("yyyy-MM-dd"), end: endDate.toString("yyyy-MM-dd") }),
    ]);
    const blockedEvents = blockedTimes.map(blockedTimeToUiEvent);
    const reservationEvents = reservations.map(reservationToUiEvent);
    return [...blockedEvents, ...reservationEvents];
}

const Calendar = () => {
    // Roles
    const { roles, userId } = useAuth();
    const canManageReservations = isManager(roles) || isProvider(roles);
    const canManageBlocks = isManager(roles) || isProvider(roles);

    // State
    const [view, setView] = useState<"Day" | "Week" | "Month" | "Resources">("Week");
    const [startDate, setStartDate] = useState(DayPilot.Date.today());
    const [events, setEvents] = useState<UiEvent[]>([]);
    const [resources, setResources] = useState<CalendarResource[]>([]);
    const [providers, setProviders] = useState<ProviderLite[]>([]);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [modalType, setModalType] = useState<"reservation" | "blockedTime">("reservation");
    const [modalValues, setModalValues] = useState<any>({});
    const [modalFormError, setModalFormError] = useState<string | null>(null);

    const tzLabel = useMemo(() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return "local time";
        }
    }, []);

    // Create (selection)
    const onTimeRangeSelected = (args: CalendarTimeRangeSelectedArgs) => {
        if (!canManageReservations) return;

        setModalType("reservation");
        setModalMode("create");
        setModalValues({
            startDate: getLocalDateString(args.start),
            startTime: getLocalTimeString(args.start),
            endDate: getLocalDateString(args.end),
            endTime: getLocalTimeString(args.end),
            // Preselect resource from the row in Resources view (args.resource), else leave empty
            resourceId: args.resource ? Number(args.resource) : undefined,
            // Preselect provider for providers themselves; managers choose explicitly
            serviceProviderId: isProvider(roles) ? userId : "",
            type: "reservation",
            participants: [],
        });
        setShowModal(true);
        setModalFormError(null);
    };

    // Edit / Details
    const onEventClick = (args: any) => {
        const type = args.e.type || args.e?.data?.type || "reservation";
        const createdByUserId = args.e?.createdByUserId || args.e?.data?.createdByUserId;

        const isOwnBlockedTime = type === "blockedTime" && (!createdByUserId || createdByUserId === userId);

        const canEdit =
            (type === "reservation" && canManageReservations) ||
            (type === "blockedTime" && (isManager(roles) || isOwnBlockedTime));

        setModalMode(canEdit ? "edit" : "create");
        setModalType(type);
        const res = args.e?.data?.reservation;
        setModalValues({
            ...extractEventFields(args.e),
            id: args.e.id,
            type,
            clientId: res?.clientId || "",
            serviceProviderId: res?.serviceProviderId || "",
            appointmentTypeId: res?.appointmentTypeId,
            notes: res?.notes || "",
            resourceId: res?.resourceId ?? undefined,
            participants: res?.participants || [],
        });
        setShowModal(true);
        setModalFormError(null);
    };

    // Save
    const handleModalSubmit = async () => {
        if (modalType === "reservation" && !canManageReservations) {
            toast.info("You don’t have permission to save reservations.");
            return;
        }
        if (modalType === "blockedTime" && !canManageBlocks) {
            toast.info("You don’t have permission to save blocked times.");
            return;
        }

        const validationError = modalType === "reservation" ? validateReservation(modalValues) : validateBlockedTime(modalValues);
        if (validationError) {
            setModalFormError(validationError);
            return;
        }

        const start = combineDateTime(modalValues.startDate, modalValues.startTime).iso as string;
        const end = combineDateTime(modalValues.endDate, modalValues.endTime).iso as string;

        try {
            if (modalMode === "edit") {
                if (modalType === "reservation") {
                    await updateReservation(modalValues.id, {
                        notes: modalValues.notes ?? undefined,
                        startTime: start,
                        endTime: end,
                        resourceId: typeof modalValues.resourceId === "number" ? modalValues.resourceId : (modalValues.resourceId ? Number(modalValues.resourceId) : undefined),
                        serviceProviderId: modalValues.serviceProviderId || undefined,
                        appointmentTypeId: modalValues.appointmentTypeId ? Number(modalValues.appointmentTypeId) : undefined,
                    });
                } else {
                    await updateBlockedTime(modalValues.id, {
                        reason: modalValues.reason ?? undefined,
                        resourceId: typeof modalValues.resourceId === "number" ? modalValues.resourceId : (modalValues.resourceId ? Number(modalValues.resourceId) : undefined),
                        startTime: start,
                        endTime: end,
                        backColor: modalValues.backColor ?? undefined,
                    });
                }
            } else {
                if (modalType === "reservation") {
                    await createReservation({
                        clientId: modalValues.clientId,
                        serviceProviderId: modalValues.serviceProviderId,
                        appointmentTypeId: Number(modalValues.appointmentTypeId),
                        startTime: start,
                        endTime: end,
                        notes: modalValues.notes ?? "",
                        resourceId: typeof modalValues.resourceId === "number" ? modalValues.resourceId : (modalValues.resourceId ? Number(modalValues.resourceId) : undefined),
                    });
                } else {
                    await createBlockedTime({
                        reason: modalValues.reason ?? "",
                        resourceId: Number(modalValues.resourceId),
                        startTime: start,
                        endTime: end,
                        backColor: modalValues.backColor ?? undefined,
                    });
                }
            }

            setShowModal(false);

            const { start: fetchStart, end: fetchEnd } = getVisibleRange(new DayPilot.Date(modalValues.startDate), view);
            const allEvents = await fetchAllEvents(fetchStart, fetchEnd);
            setEvents(allEvents);
        } catch (err: any) {
            // Inline message for known server codes (create/update throw Error(message) for UNAVAILABLE)
            if (err instanceof Error && err.message) {
                setModalFormError(err.message);
                return;
            }
            if (err?.response?.status === 403) {
                toast.error("You don’t have permission to perform this action.");
            } else if (err?.response?.data) {
                toast.error(String(err.response.data));
            } else {
                toast.error("Something went wrong. Please try again.");
            }
        }
    };

    // Delete
    const handleModalDelete = async () => {
        if (modalType === "reservation" && !canManageReservations) {
            toast.info("You don’t have permission to delete reservations.");
            return;
        }
        if (modalType === "blockedTime" && !canManageBlocks) {
            toast.info("You don’t have permission to delete blocked times.");
            return;
        }

        if (modalType === "reservation") {
            await deleteReservation(modalValues.id);
        } else {
            await deleteBlockedTime(modalValues.id);
        }
        setShowModal(false);

        const { start: fetchStart, end: fetchEnd } = getVisibleRange(new DayPilot.Date(modalValues.startDate), view);
        const allEvents = await fetchAllEvents(fetchStart, fetchEnd);
        setEvents(allEvents);
    };

    // Initial Load
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const { start, end } = getVisibleRange(startDate, view);

                const [resourceList, eventsList, providersTry] = await Promise.all([
                    getResources(),
                    fetchAllEvents(start, end),
                    getProvidersLite().catch(() => null),
                ]);

                if (cancelled) return;

                setResources(resourceList);
                setEvents(eventsList);

                if (providersTry && providersTry.length) {
                    setProviders(providersTry);
                } else {
                    const derived = Array.from(
                        new Set(
                            eventsList
                                .map((e) => e?.reservation?.serviceProviderId as string | undefined)
                                .filter(Boolean) as string[]
                        )
                    ).map((id) => ({ id, name: id }));
                    setProviders(derived);
                }
            } catch (err) {
                if (!cancelled) console.error("⛔ Calendar API fetch failed", err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [startDate, view]);


    // Read-only modal logic (disables save/delete)
    const readOnly =
        (modalType === "reservation" && !canManageReservations) ||
        (modalType === "blockedTime" && modalValues?.createdByUserId && modalValues.createdByUserId !== userId && !isManager(roles));

    return (
        <>
            <EventModal
                open={showModal}
                mode={modalMode}
                type={modalType}
                setType={setModalType}
                values={modalValues}
                setValues={setModalValues}
                onSubmit={readOnly ? undefined : handleModalSubmit}
                onDelete={!readOnly && modalMode === "edit" ? handleModalDelete : undefined}
                onCancel={() => setShowModal(false)}
                error={modalFormError}
                resources={resources}
                providers={providers}
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
                    <div className="calendar-toolbar flex items-center gap-2 p-2 border-b bg-gray-100">
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
                        <span className="ml-auto text-xs text-gray-600">All times in {tzLabel}</span>
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
                                    { groupBy: "Hour" },
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

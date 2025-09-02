import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { DayPilot, DayPilotCalendar, DayPilotMonth, DayPilotNavigator, DayPilotScheduler } from "@daypilot/daypilot-lite-react";

import { getResources } from "@/api/calendar-resource-api";
import { getBlockedTimes, createBlockedTime, updateBlockedTime, deleteBlockedTime } from "@/api/blockedtime-api";
import { getReservations, createReservation, updateReservation, deleteReservation } from "@/api/reservation-api";
import { getProvidersLite } from "@/api/user-api";
import { listAvailability } from "@/api/provider-availability-api";
import { getOrgSettings } from "@/api/org-settings-api";
import type { OrgSettingsDto, DefaultCalendarView, CalendarShadingMode } from "@/api/org-settings-api";

import EventModal from "@/components/modals/EventModal";
import { formatWeekHeader } from "@/utilities/calendarDisplay/formatWeekHeader";
import { getVisibleRange } from "@/utilities/calendarDisplay/getVisibleRange";
import { getLocalDateString, getLocalTimeString, combineDateTime } from "@/utilities/conversions/dateParsing";
import { extractEventFields } from "@/utilities/legacy/extractEventFields";
import { blockedTimeToUiEvent } from "@/utilities/mapping/blockedTimeToUiEvent";
import { reservationToUiEvent } from "@/utilities/mapping/reservationToUiEvent";
import { validateReservation } from "@/utilities/formFields/validateReservation";
import { validateBlockedTime } from "@/utilities/formFields/validateBlockedTime";
import {
    isRangeAllowedForProvider,
    isRangeInsideBusinessHours,
} from "@/domain/calendar/availability";
import {
    isAvailabilityViolation,
    isInsideCancelWindow,
    isConflict,
} from "@/domain/calendar/errors";

import "@styles/Calendar.css";
import type {
    CalendarResource,
    UiEvent,
    CalendarTimeRangeSelectedArgs,
    ProviderAvailabilityDto,
} from "@/types";
import { useAuth } from "@/components/auth/AuthContext";
import type { ReservationDto } from "@/api/reservation-api";

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
    const { userId, isManager, isProvider } = useAuth();
    const canManageReservations = isManager || isProvider;
    const canManageBlocks = isManager || isProvider;

    // Org settings (optional if 403)
    const [org, setOrg] = useState<OrgSettingsDto | null>(null);
    const appliedOrgDefaultView = useRef(false);

    // State
    const [view, setView] = useState<DefaultCalendarView>("Week");
    const [startDate, setStartDate] = useState(DayPilot.Date.today());
    const [events, setEvents] = useState<UiEvent[]>([]);
    const [resources, setResources] = useState<CalendarResource[]>([]);
    const [providers, setProviders] = useState<ProviderLite[]>([]);
    const [showCanceled, setShowCanceled] = useState<boolean>(true);

    // Availability (keyed by provider)
    const [availabilityByProvider, setAvailabilityByProvider] = useState<Map<string, ProviderAvailabilityDto[]>>(new Map());
    const [overlayProviderId, setOverlayProviderId] = useState<string | undefined>(isProvider ? userId ?? undefined : undefined);

    // Modal
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

    // Normalized org-driven presentation knobs with safe defaults
    const shadingMode: CalendarShadingMode = org?.shadingMode ?? "ProviderAvailability";
    const businessStart = org?.businessHoursStartLocal ?? "08:00:00";
    const businessEnd = org?.businessHoursEndLocal ?? "18:00:00";

    const refreshVisibleEvents = async () => {
        const { start, end } = getVisibleRange(startDate, view);
        const all = await fetchAllEvents(start, end);
        setEvents(all);
    };

    // Cell shading/disable via org setting
    const beforeCellRender = (args: any) => {
        let allowed = true;
        if (shadingMode === "ProviderAvailability" && overlayProviderId) {
            // gate by provider windows
            allowed = isRangeAllowedForProvider(
                availabilityByProvider,
                overlayProviderId,
                args.cell.start.toDate(),
                args.cell.end.toDate()
            );
        } else if (shadingMode === "OrgBusinessHours") {
            // gate by org business hours
            allowed = isRangeInsideBusinessHours(
                args.cell.start.toDate(),
                args.cell.end.toDate(),
                businessStart,
                businessEnd
            );
        }

        if (!allowed) {
            args.cell.cssClass = "unavailable-cell";
            args.cell.toolTip = shadingMode === "OrgBusinessHours"
                ? "Outside business hours"
                : "Outside provider availability";
            // Providers are blocked; managers can still select to override in modal.
            if (isProvider && !isManager) args.cell.disabled = true;
        }
    };

    // Reservation status → color + class
    const colorByStatus = (status?: string) => {
        switch (status) {
            case "Completed": return { backColor: "#10b981", cssClass: "res-status-completed" };
            case "Canceled": return { backColor: "#9ca3af", cssClass: "res-status-canceled" };
            case "NoShow": return { backColor: "#f59e0b", cssClass: "res-status-noshow" };
            default: return { backColor: "#3b82f6", cssClass: "res-status-booked" };
        }
    };

    const beforeEventRender = (args: any) => {
        const e = args.data;
        if (e?.type === "reservation" && e?.reservation) {
            const res: ReservationDto = e.reservation;
            const { backColor, cssClass } = colorByStatus(res.status);
            args.data.backColor = backColor;
            args.data.toolTip = `Reservation • ${res.status}`;
            args.data.cssClass = [e.cssClass, cssClass].filter(Boolean).join(" ");
        }
    };

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
            resourceId: args.resource ? Number(args.resource) : undefined,
            serviceProviderId: isProvider && !isManager ? userId : "",
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
            (type === "blockedTime" && (isManager || isOwnBlockedTime));

        const res = args.e?.data?.reservation;
        if (type === "reservation" && isProvider && !isManager && res?.serviceProviderId && res.serviceProviderId !== userId) {
            toast.info("You’re viewing another provider’s event. Switch provider or ask a manager to edit.");
        }

        setModalMode(canEdit ? "edit" : "create");
        setModalType(type);
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

    // Save from modal (with override flows)
    const handleModalSubmit = async () => {
        if (modalType === "reservation" && !canManageReservations) { toast.info("You don’t have permission to save reservations."); return; }
        if (modalType === "blockedTime" && !canManageBlocks) { toast.info("You don’t have permission to save blocked times."); return; }

        const validationError = modalType === "reservation" ? validateReservation(modalValues) : validateBlockedTime(modalValues);
        if (validationError) { setModalFormError(validationError); return; }

        const start = combineDateTime(modalValues.startDate, modalValues.startTime).iso as string;
        const end = combineDateTime(modalValues.endDate, modalValues.endTime).iso as string;

        // Client-side nudge against provider availability; server remains source of truth.
        const providerForCheck =
            (isProvider && !isManager ? userId : undefined) ??
            (modalValues.serviceProviderId || undefined) ??
            overlayProviderId;

        if (providerForCheck) {
            const allowed = isRangeAllowedForProvider(availabilityByProvider, providerForCheck, start, end);
            if (!allowed) {
                const msg = "Selected time is outside provider availability.";
                if (isProvider && !isManager) { setModalFormError(msg); toast.error(msg); return; }
                toast.warning(msg);
            }
        }

        try {
            if (modalMode === "edit") {
                if (modalType === "reservation") {
                    try {
                        await updateReservation(
                            modalValues.id,
                            {
                                notes: modalValues.notes ?? undefined,
                                startTime: start,
                                endTime: end,
                                resourceId: typeof modalValues.resourceId === "number" ? modalValues.resourceId
                                    : modalValues.resourceId ? Number(modalValues.resourceId) : undefined,
                                serviceProviderId: modalValues.serviceProviderId || undefined,
                                appointmentTypeId: modalValues.appointmentTypeId ? Number(modalValues.appointmentTypeId) : undefined,
                            }
                        );
                    } catch (err: any) {
                        if (isAvailabilityViolation(err)) {
                            const ok = window.confirm("This is outside provider availability. Proceed anyway?");
                            if (!ok) throw err;
                            await updateReservation(
                                modalValues.id,
                                {
                                    notes: modalValues.notes ?? undefined,
                                    startTime: start,
                                    endTime: end,
                                    resourceId: typeof modalValues.resourceId === "number" ? modalValues.resourceId
                                        : modalValues.resourceId ? Number(modalValues.resourceId) : undefined,
                                    serviceProviderId: modalValues.serviceProviderId || undefined,
                                    appointmentTypeId: modalValues.appointmentTypeId ? Number(modalValues.appointmentTypeId) : undefined,
                                },
                                { overrideAvailability: true }
                            );
                        } else if (isInsideCancelWindow(err) && isManager) {
                            const ok = window.confirm("This is inside the organization’s change window. Override and proceed?");
                            if (!ok) throw err;
                            await updateReservation(
                                modalValues.id,
                                {
                                    notes: modalValues.notes ?? undefined,
                                    startTime: start,
                                    endTime: end,
                                    resourceId: typeof modalValues.resourceId === "number" ? modalValues.resourceId
                                        : modalValues.resourceId ? Number(modalValues.resourceId) : undefined,
                                    serviceProviderId: modalValues.serviceProviderId || undefined,
                                    appointmentTypeId: modalValues.appointmentTypeId ? Number(modalValues.appointmentTypeId) : undefined,
                                },
                                { managerOverride: true }
                            );
                        } else {
                            throw err;
                        }
                    }
                } else {
                    await updateBlockedTime(modalValues.id, {
                        reason: modalValues.reason ?? undefined,
                        resourceId: typeof modalValues.resourceId === "number" ? modalValues.resourceId
                            : modalValues.resourceId ? Number(modalValues.resourceId) : undefined,
                        startTime: start,
                        endTime: end,
                        backColor: modalValues.backColor ?? undefined,
                    });
                }
            } else {
                if (modalType === "reservation") {
                    try {
                        await createReservation({
                            clientId: modalValues.clientId,
                            serviceProviderId: modalValues.serviceProviderId,
                            appointmentTypeId: Number(modalValues.appointmentTypeId),
                            startTime: start,
                            endTime: end,
                            notes: modalValues.notes ?? "",
                            resourceId: typeof modalValues.resourceId === "number" ? modalValues.resourceId
                                : modalValues.resourceId ? Number(modalValues.resourceId) : undefined,
                        });
                    } catch (err: any) {
                        if (isAvailabilityViolation(err)) {
                            const ok = window.confirm("This is outside provider availability. Proceed anyway?");
                            if (!ok) throw err;
                            await createReservation(
                                {
                                    clientId: modalValues.clientId,
                                    serviceProviderId: modalValues.serviceProviderId,
                                    appointmentTypeId: Number(modalValues.appointmentTypeId),
                                    startTime: start,
                                    endTime: end,
                                    notes: modalValues.notes ?? "",
                                    resourceId: typeof modalValues.resourceId === "number" ? modalValues.resourceId
                                        : modalValues.resourceId ? Number(modalValues.resourceId) : undefined,
                                },
                                { overrideAvailability: true }
                            );
                        } else {
                            throw err;
                        }
                    }
                } else {
                    await createBlockedTime({
                        reason: modalValues.reason ?? "",
                        resourceId: typeof modalValues.resourceId === "number" ? modalValues.resourceId
                            : modalValues.resourceId ? Number(modalValues.resourceId) : undefined,
                        startTime: start,
                        endTime: end,
                        backColor: modalValues.backColor ?? undefined,
                    });
                }
            }

            setShowModal(false);
            await refreshVisibleEvents();
        } catch (err: any) {
            if (isConflict(err)) {
                const message =
                    (err?.response?.data?.message as string | undefined) ||
                    (typeof err?.response?.data === "string" ? err.response.data : undefined) ||
                    "Time overlaps with another item.";
                setModalFormError(message);
                toast.error(message);
                return;
            }

            if (err?.response?.status === 403) {
                toast.error("You don’t have permission to perform this action.");
            } else if (typeof err?.message === "string" && err.message) {
                setModalFormError(err.message);
            } else {
                toast.error("Something went wrong. Please try again.");
            }
        }
    };

    // Delete from modal
    const handleModalDelete = async () => {
        if (modalType === "reservation" && !canManageReservations) { toast.info("You don’t have permission to delete reservations."); return; }
        if (modalType === "blockedTime" && !canManageBlocks) { toast.info("You don’t have permission to delete blocked times."); return; }

        if (modalType === "reservation") await deleteReservation(modalValues.id);
        else await deleteBlockedTime(modalValues.id);

        setShowModal(false);
        await refreshVisibleEvents();
    };

    // Initial load + view changes
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                // Org settings (best-effort; ignore 403 so non-managers still see calendar)
                try {
                    const s = await getOrgSettings();
                    if (!cancelled) setOrg(s);
                } catch (err: any) {
                    if (err?.response?.status !== 403 && !cancelled) {
                        // eslint-disable-next-line no-console
                        console.warn("Org settings fetch failed", err);
                    }
                }

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
        return () => { cancelled = true; };
    }, [startDate, view]);

    // Apply org default view once (when settings first arrive)
    useEffect(() => {
        if (org?.defaultView && !appliedOrgDefaultView.current) {
            setView(org.defaultView as DefaultCalendarView);
            appliedOrgDefaultView.current = true;
        }
    }, [org]);

    // Fetch availability on overlay provider change
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (!overlayProviderId) {
                    if (!cancelled) setAvailabilityByProvider(new Map());
                    return;
                }
                const list = await listAvailability(overlayProviderId);
                if (cancelled) return;
                const map = new Map<string, ProviderAvailabilityDto[]>();
                map.set(overlayProviderId, list);
                setAvailabilityByProvider(map);
            } catch (err) {
                console.error("⛔ Availability fetch failed", err);
            }
        })();
        return () => { cancelled = true; };
    }, [overlayProviderId]);

    // Filtered events for display (toggle canceled)
    const visibleEvents = useMemo(() => {
        if (showCanceled) return events;
        return events.filter((e) => e.type !== "reservation" || e?.reservation?.status !== "Canceled");
    }, [events, showCanceled]);

    const readOnly =
        (modalType === "reservation" && !canManageReservations) ||
        (modalType === "blockedTime" && modalValues?.createdByUserId && modalValues.createdByUserId !== userId && !isManager);

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
                onRefreshRequested={refreshVisibleEvents}
            />

            <div className="calendar-container w-full h-full flex flex-row overflow-hidden">
                <div className="calendar-sidebar w-64 bg-white shadow-md border-r border-gray-200">
                    <DayPilotNavigator
                        theme="betterschedule_navigator"
                        selectMode={view === "Month" ? "Month" : "Day"}
                        showMonths={3}
                        skipMonths={3}
                        onTimeRangeSelected={(args) => setStartDate(args.day)}
                        events={visibleEvents}
                    />
                </div>
                <div className="calendar-main flex flex-col flex-1 min-w-0">
                    <div className="calendar-toolbar flex items-center gap-2 p-2 border-b bg-gray-100">
                        <button onClick={() => setView("Day")} className={view === "Day" ? "selected" : ""}>Day</button>
                        <button onClick={() => setView("Week")} className={view === "Week" ? "selected" : ""}>Week</button>
                        <button onClick={() => setView("Month")} className={view === "Month" ? "selected" : ""}>Month</button>
                        <button onClick={() => setView("Resources")} className={view === "Resources" ? "selected" : ""}>Resources</button>
                        <button onClick={() => setStartDate(DayPilot.Date.today())} className="standalone">Today</button>

                        <div className="ml-4 flex items-center gap-2">
                            <span className="text-xs text-gray-600">Availability overlay:</span>
                            <select
                                className="border rounded px-2 py-1 text-sm"
                                value={overlayProviderId ?? ""}
                                onChange={(e) => setOverlayProviderId(e.target.value || undefined)}
                            >
                                <option value="">(none)</option>
                                {providers.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name || p.id}</option>
                                ))}
                            </select>
                        </div>

                        <div className="ml-4 flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1">
                                <span className="inline-block w-3 h-3 rounded" style={{ background: "#3b82f6" }} />
                                <span>Booked</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="inline-block w-3 h-3 rounded" style={{ background: "#10b981" }} />
                                <span>Completed</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="inline-block w-3 h-3 rounded" style={{ background: "#f59e0b" }} />
                                <span>No-Show</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="inline-block w-3 h-3 rounded" style={{ background: "#9ca3af" }} />
                                <span>Canceled</span>
                            </div>

                            <label className="ml-2 inline-flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    className="align-middle"
                                    checked={showCanceled}
                                    onChange={(e) => setShowCanceled(e.target.checked)}
                                />
                                <span>Show canceled</span>
                            </label>
                        </div>

                        <span className="ml-auto text-xs text-gray-600">All times in {tzLabel}</span>
                    </div>

                    <div className="calendar-body flex-1 overflow-auto">
                        {view === "Day" && (
                            <DayPilotCalendar
                                viewType="Day"
                                theme="betterschedule"
                                startDate={startDate}
                                events={visibleEvents}
                                durationBarVisible={false}
                                onTimeRangeSelected={onTimeRangeSelected}
                                onEventClick={onEventClick}
                                onBeforeCellRender={beforeCellRender}
                                onBeforeEventRender={beforeEventRender}
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
                                events={visibleEvents}
                                durationBarVisible={false}
                                onTimeRangeSelected={onTimeRangeSelected}
                                onEventClick={onEventClick}
                                onBeforeCellRender={beforeCellRender}
                                onBeforeEventRender={beforeEventRender}
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
                                    events={visibleEvents}
                                    eventBarVisible={false}
                                    onTimeRangeSelected={onTimeRangeSelected}
                                    onEventClick={onEventClick}
                                    onBeforeEventRender={beforeEventRender}
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
                                events={visibleEvents}
                                onEventClick={onEventClick}
                                onBeforeEventRender={beforeEventRender}
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

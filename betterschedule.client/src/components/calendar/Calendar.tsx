import { useMemo } from "react";
import "@styles/Calendar.css";

import { useAuth } from "@/components/auth/AuthContext";
import CalendarNavigatorPane from "./CalendarNavigatorPane";
import CalendarToolbar from "./CalendarToolbar";
import CalendarLegend from "./CalendarLegend";
import CalendarBody from "./CalendarBody";
import EventModal from "@/components/modals/EventModal";

import { useCalendarData } from "@/hooks/useCalendarData";
import { useAvailabilityOverlay } from "@/hooks/useAvailabilityOverlay";
import { useCalendarView } from "@/hooks/useCalendarView";
import { useEventModal } from "@/hooks/useEventModal";
import { filterEventsByCanceled } from "@/services/eventsService";
import { buildBusinessHours } from "@/services/availabilityService";
import { useCalendarShading } from "@/hooks/useCalendarShading";

import type { UiEvent, CalendarResource, CalendarTimeRangeSelectedArgs } from "@/types";
import type { ViewMode } from "@/types/calendarView";
import type { ProviderLite } from "@/services/providersService";

/**
 * Root calendar component that composes data sources, DayPilot callbacks, and modal handlers.
 * Renders navigator, toolbar, legend, and the main calendar body for all views.
 */
const Calendar = () => {
    const { userId, isManager, isProvider } = useAuth();
    const canManageReservations = isManager || isProvider;
    const canManageBlocks = isManager || isProvider;

    const { org, view, setView, startDate, setStartDate, tzLabel, goToday } = useCalendarView();
    const { resources, events, providers, refreshEvents } = useCalendarData(startDate, view);
    const { overlayProviderId, setOverlayProviderId, availabilityByProvider } = useAvailabilityOverlay(
        isProvider ? userId ?? undefined : undefined
    );

    const {
        open,
        setOpen,
        mode,
        type,
        setType,
        values,
        setValues,
        formError,
        readOnly,
        canDelete,
        onTimeRangeSelected,
        onEventClick,
        submit,
        remove,
    } = useEventModal({
        canManageReservations,
        canManageBlocks,
        isProvider,
        isManager,
        userId,
        org,
        overlayProviderId,
        availabilityByProvider,
        refreshEvents,
    });

    const visibleEvents = useMemo(() => filterEventsByCanceled(events, false), [events]);

    const orgBusiness = useMemo(() => buildBusinessHours(org), [org]);
    const businessBeginsHour = useMemo(
        () => (orgBusiness ? parseInt(orgBusiness.startHHmm.slice(0, 2), 10) : undefined),
        [orgBusiness]
    );
    const businessEndsHour = useMemo(
        () => (orgBusiness ? parseInt(orgBusiness.endHHmm.slice(0, 2), 10) : undefined),
        [orgBusiness]
    );

    const { beforeCellRender, beforeSchedulerCellRender, beforeEventRender, showOverlaySelector } = useCalendarShading({
        org,
        availabilityByProvider,
        overlayProviderId,
        isProvider,
        isManager,
        businessHours: orgBusiness,
    });

    return (
        <>
            <EventModal
                open={open}
                mode={mode}
                type={type}
                setType={setType}
                values={values}
                setValues={setValues}
                onSubmit={readOnly ? undefined : submit}
                onDelete={canDelete ? remove : undefined}
                onCancel={() => setOpen(false)}
                error={formError}
                resources={resources as CalendarResource[]}
                providers={providers as ProviderLite[]}
                onRefreshRequested={refreshEvents}
            />

            <div className="calendar-container w-full h-full flex flex-row overflow-hidden">
                <CalendarNavigatorPane
                    view={view as ViewMode}
                    visibleEvents={visibleEvents as UiEvent[]}
                    onDateChange={(d) => setStartDate(d)}
                />

                <div className="calendar-main flex flex-col flex-1 min-w-0">
                    <CalendarToolbar
                        view={view as ViewMode}
                        onSetView={(v) => setView(v)}
                        onToday={() => goToday()}
                        tzLabel={tzLabel}
                        showOverlaySelector={showOverlaySelector}
                        providers={providers}
                        overlayProviderId={overlayProviderId}
                        onOverlayChange={setOverlayProviderId}
                    />

                    <CalendarLegend />

                    <CalendarBody
                        view={view as ViewMode}
                        startDate={startDate}
                        resources={resources}
                        events={visibleEvents}
                        onTimeRangeSelected={onTimeRangeSelected as (args: CalendarTimeRangeSelectedArgs) => void}
                        onEventClick={onEventClick}
                        beforeCellRender={beforeCellRender}
                        beforeSchedulerCellRender={beforeSchedulerCellRender}
                        beforeEventRender={beforeEventRender}
                        businessBeginsHour={businessBeginsHour}
                        businessEndsHour={businessEndsHour}
                        heightSpec="BusinessHours"
                    />
                </div>
            </div>
        </>
    );
};

export default Calendar;

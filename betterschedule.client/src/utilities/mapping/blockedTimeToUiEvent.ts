import { utcIsoToDayPilotLocal } from "@/utilities/conversions";
import type { UiEvent } from "@/types/calendarDataTypes";
import type { BlockedTimeDto } from "@/api/blockedtime-api";

/**
 * Maps a blocked-time DTO into a DayPilot UI event.
 * Ensures `resource` matches Resource view column ids (cast to string).
 */
export function blockedTimeToUiEvent(block: BlockedTimeDto): UiEvent {
    const resourceKey =
        block.resourceId !== null && block.resourceId !== undefined
            ? String(block.resourceId)
            : undefined;

    return {
        id: `block-${block.id}`,
        text: block.reason ?? "(Unavailable)",
        start: utcIsoToDayPilotLocal(block.startTime),
        end: utcIsoToDayPilotLocal(block.endTime),
        /** Match DayPilotCalendar(Resources) columns[*].id. */
        resource: resourceKey,
        cssClass: "ev-blocked",
        type: "blockedTime",
        blockedTime: block,
        createdByUserId: block.createdByUserId,
        toolTip: "Blocked time",
        // Hide the default duration bar; we use our dashed style.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        barHidden: true,
    } as UiEvent;
}

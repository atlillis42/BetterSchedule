import { utcIsoToDayPilotLocal } from "@/utilities/conversions";
import type { UiEvent } from "@/types/calendarDataTypes";
import type { BlockedTimeDto } from "@/api/blockedtime-api";

/**
 * Maps a blocked-time DTO into a DayPilot UI event.
 */
export function blockedTimeToUiEvent(block: BlockedTimeDto): UiEvent {
    return {
        id: `block-${block.id}`,
        text: block.reason ?? "(Unavailable)",
        start: utcIsoToDayPilotLocal(block.startTime),
        end: utcIsoToDayPilotLocal(block.endTime),
        resource: block.resourceId ?? undefined,
        cssClass: "ev-blocked",
        type: "blockedTime",
        blockedTime: block,
        createdByUserId: block.createdByUserId,
        toolTip: "Blocked time",
        barHidden: true,
    } as UiEvent;
}

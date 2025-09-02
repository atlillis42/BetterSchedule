import { utcIsoToDayPilotLocal } from "@/utilities/conversions";
import type { UiEvent } from "@/types/calendarDataTypes";
import type { BlockedTimeDto } from "@/api/blockedtime-api";

/**
 * Maps a blocked-time DTO into a DayPilot UI event.
 * @param block Blocked time read model.
 */
export function blockedTimeToUiEvent(block: BlockedTimeDto): UiEvent {
    return {
        id: `block-${block.id}`,
        text: block.reason ?? "(Unavailable)",
        start: utcIsoToDayPilotLocal(block.startTime),
        end: utcIsoToDayPilotLocal(block.endTime),
        resource: block.resourceId ?? undefined,
        backColor: block.backColor ?? undefined,
        type: "blockedTime",
        blockedTime: block,
        createdByUserId: block.createdByUserId,
    };
}

import { utcIsoToDayPilotLocal } from "@/utilities/conversions";
import type { UiEvent } from "@/types/calendarDataTypes";
import type { BlockedTimeDto } from "@api/blockedtime-api";

/**
 * Maps BlockedTimeDto (API) → UiEvent (for calendar display)
 */

export function blockedTimeToUiEvent(block: BlockedTimeDto): UiEvent {
    return {
        id: `block-${block.id}`,
        text: block.reason ?? "(Unavailable)",
        start: utcIsoToDayPilotLocal(block.startTime),
        end: utcIsoToDayPilotLocal(block.endTime),
        resource: block.resourceId,
        backColor: block.backColor ?? "#e5e7eb",
        type: "blockedTime",
        blockedTime: block,
    };
}

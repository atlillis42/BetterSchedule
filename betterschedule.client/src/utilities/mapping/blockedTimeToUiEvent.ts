import { utcIsoToDayPilotLocal } from "@/utilities/conversions";
import type { UiEvent } from "@/types/calendarDataTypes";
import type { BlockedTimeDto } from "@api/blockedtime-api";

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
        createdByUserId: block.createdByUserId, // used for ownership gating in UI
    };
}

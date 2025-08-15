import { api } from "@auth/axios";
import { toast } from "react-toastify";

/**
 * Blocked time returned from the API.
 */
export type BlockedTimeDto = {
    id: number;
    organizationId: string;
    reason: string;
    startTime: string;       // ISO
    endTime: string;         // ISO
    resourceId: number;
    backColor?: string | null;
    createdByUserId: string;           // owner (read-only)
    createdByUserName?: string | null; // optional display name
    isDeleted: boolean;
};

/**
 * Payload for creating a new blocked time.
 */
export type CreateBlockedTimeDto = {
    reason: string;
    startTime: string; // ISO
    endTime: string;   // ISO
    resourceId: number;
    backColor?: string | null;
};

/**
 * Payload for updating an existing blocked time.
 */
export type UpdateBlockedTimeDto = {
    reason?: string | null;
    startTime?: string; // ISO
    endTime?: string;   // ISO
    resourceId?: number | null;
    backColor?: string | null;
};

/**
 * Retrieves blocked times within an optional range.
 * @param params - Optional start and end ISO timestamps.
 * @returns List of blocked times.
 */
export async function getBlockedTimes(params: { start?: string; end?: string; }): Promise<BlockedTimeDto[]> {
    const { data } = await api.get("/blocked-times", { params });
    return data;
}

/**
 * Creates a new blocked time.
 * @param payload - Blocked time details.
 * @param opts - Optional behaviour flags.
 * @returns The created blocked time.
 */
export async function createBlockedTime(
    payload: CreateBlockedTimeDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<BlockedTimeDto> {
    try {
        const { data } = await api.post<BlockedTimeDto>("/blocked-times", payload);
        if (opts.toastSuccess) toast.success("Blocked time created.");
        return data;
    } catch (err: any) {
        const code = err?.response?.data?.code;
        const message =
            err?.response?.data?.message ||
            (code === "RESERVATIONS_EXIST"
                ? "Existing reservations exist in this window. Adjust or reschedule first."
                : code === "BLOCK_OVERLAP"
                    ? "This block overlaps an existing block."
                    : "Failed to create blocked time.");
        if (code) throw new Error(message);
        throw err;
    }
}

/**
 * Updates an existing blocked time.
 * @param id - Blocked time identifier.
 * @param payload - Updated fields for the block.
 * @param opts - Optional behaviour flags.
 */
export async function updateBlockedTime(
    id: number,
    payload: UpdateBlockedTimeDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    try {
        await api.put(`/blocked-times/${id}`, payload);
        if (opts.toastSuccess) toast.success("Blocked time updated.");
    } catch (err: any) {
        const code = err?.response?.data?.code;
        const message =
            err?.response?.data?.message ||
            (code === "RESERVATIONS_EXIST"
                ? "Existing reservations exist in this window. Adjust or reschedule first."
                : code === "BLOCK_OVERLAP"
                    ? "This block overlaps an existing block."
                    : "Failed to update blocked time.");
        if (code) throw new Error(message);
        throw err;
    }
}

/**
 * Deletes a blocked time.
 * @param id - Blocked time identifier.
 * @param opts - Optional behaviour flags.
 */
export async function deleteBlockedTime(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.delete(`/blocked-times/${id}`);
    if (opts.toastSuccess) toast.success("Blocked time deleted.");
}

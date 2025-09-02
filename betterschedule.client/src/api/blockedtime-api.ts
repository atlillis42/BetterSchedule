import { api } from "@auth/axios";
import { toast } from "react-toastify";

/** Blocked time entry. */
export type BlockedTimeDto = {
    /** Identifier of the block. */
    id: number;
    /** Owning organization id. */
    organizationId: string;
    /** Reason shown to users. */
    reason: string;
    /** Absolute start timestamp (ISO 8601). */
    startTime: string;
    /** Absolute end timestamp (ISO 8601). */
    endTime: string;
    /**
     * Target resource id, or null for a provider self-block.
     * When null, the block applies to the creator's schedule.
     * When set, the block applies to the specified resource.
     */
    resourceId?: number | null;
    /** Optional CSS hex color (e.g., "#3a87ad"). */
    backColor?: string | null;
    /** Creator user id (server-stamped). */
    createdByUserId: string;
    /** Creator display name, if available. */
    createdByUserName?: string | null;
    /** Soft-delete flag. */
    isDeleted: boolean;
};

/** Payload to create a blocked time. */
export type CreateBlockedTimeDto = {
    /** Reason shown to users. */
    reason: string;
    /** Absolute start timestamp (ISO 8601). */
    startTime: string;
    /** Absolute end timestamp (ISO 8601). Must be after `startTime`. */
    endTime: string;
    /**
     * Resource to block, or null for a provider self-block (creator's schedule).
     * Omit to leave as a self-block.
     */
    resourceId?: number | null;
    /** Optional CSS hex color (e.g., "#3a87ad"). */
    backColor?: string | null;
};

/**
 * Payload to update a blocked time.
 * Provide only fields to change. Use `clearResource` to convert a resource block to a provider self-block.
 */
export type UpdateBlockedTimeDto = {
    /** New reason. */
    reason?: string | null;
    /** New start timestamp (ISO 8601). */
    startTime?: string;
    /** New end timestamp (ISO 8601). Must be after `startTime`. */
    endTime?: string;
    /**
     * New resource id. Omit to leave unchanged.
     * Conflicts with `clearResource` when both are sent.
     */
    resourceId?: number | null;
    /**
     * When true, clears the resource assignment (becomes a provider self-block for the creator).
     * Conflicts with `resourceId`.
     */
    clearResource?: boolean;
    /** Optional CSS hex color. */
    backColor?: string | null;
};

type ApiError = { code?: string; message?: string };

function mapCreateUpdateError(err: any): never {
    const p: ApiError | undefined = err?.response?.data;
    if (p?.code === "RESERVATION_CONFLICT") throw new Error(p.message ?? "This block overlaps one or more reservations.");
    if (p?.code === "BLOCK_OVERLAP") throw new Error(p.message ?? "This block overlaps an existing block.");
    throw err;
}

/** Retrieves blocked times, optionally filtered by `[start, end)` range; results are ordered by start time. */
export async function getBlockedTimes(params: { start?: string; end?: string }): Promise<BlockedTimeDto[]> {
    const { data } = await api.get("/blocked-times", { params });
    return data;
}

/** Creates a blocked time; creator and org are stamped server-side. */
export async function createBlockedTime(
    payload: CreateBlockedTimeDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<BlockedTimeDto> {
    try {
        const { data } = await api.post<BlockedTimeDto>("/blocked-times", payload);
        if (opts.toastSuccess) toast.success("Blocked time created.");
        return data;
    } catch (err: any) {
        mapCreateUpdateError(err);
    }
}

/** Updates a blocked time; partial update with optional `clearResource`. */
export async function updateBlockedTime(
    id: number,
    payload: UpdateBlockedTimeDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    try {
        await api.put(`/blocked-times/${id}`, payload);
        if (opts.toastSuccess) toast.success("Blocked time updated.");
    } catch (err: any) {
        mapCreateUpdateError(err);
    }
}

/** Soft-deletes a blocked time. */
export async function deleteBlockedTime(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.delete(`/blocked-times/${id}`);
    if (opts.toastSuccess) toast.success("Blocked time deleted.");
}

import { api } from "@auth/axios";
import { toast } from "react-toastify";

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

export type CreateBlockedTimeDto = {
    reason: string;
    startTime: string; // ISO
    endTime: string;   // ISO
    resourceId: number;
    backColor?: string | null;
};

export type UpdateBlockedTimeDto = {
    reason?: string | null;
    startTime?: string; // ISO
    endTime?: string;   // ISO
    resourceId?: number | null;
    backColor?: string | null;
};

export async function getBlockedTimes(params: { start?: string; end?: string; }): Promise<BlockedTimeDto[]> {
    const { data } = await api.get("/blocked-times", { params });
    return data;
}

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

export async function deleteBlockedTime(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.delete(`/blocked-times/${id}`);
    if (opts.toastSuccess) toast.success("Blocked time deleted.");
}

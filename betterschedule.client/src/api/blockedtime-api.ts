import { api } from "@auth/axios";
import { toast } from "react-toastify";

export type BlockedTimeDto = {
    id: number;
    organizationId: string;
    reason: string;
    startTime: string; // ISO
    endTime: string;   // ISO
    resourceId: number;
    backColor?: string | null;
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
    reason: string;
    startTime: string; // ISO
    endTime: string;   // ISO
    resourceId: number;
    backColor?: string | null;
};

export async function getBlockedTimes(params: {
    start?: string;
    end?: string;
}): Promise<BlockedTimeDto[]> {
    const { data } = await api.get("/blocked-times", { params });
    return data;
}

export async function createBlockedTime(
    payload: CreateBlockedTimeDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<BlockedTimeDto> {
    const { data } = await api.post("/blocked-times", payload);
    if (opts.toastSuccess) toast.success("Blocked time created.");
    return data;
}

export async function updateBlockedTime(
    id: number,
    payload: UpdateBlockedTimeDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.put(`/blocked-times/${id}`, payload);
    if (opts.toastSuccess) toast.success("Blocked time updated.");
}

export async function deleteBlockedTime(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.delete(`/blocked-times/${id}`);
    if (opts.toastSuccess) toast.success("Blocked time deleted.");
}

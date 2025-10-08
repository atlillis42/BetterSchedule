import { api } from "@auth/axios";
import { toast } from "react-toastify";

export type BlockedTimeDto = {
    id: number;
    organizationId: string;
    reason: string;
    startTime: string;
    endTime: string;
    resourceId?: number | null;
    backColor?: string | null;
    createdByUserId: string;
    createdByUserName?: string | null;
    isDeleted: boolean;
};

export type CreateBlockedTimeDto = {
    reason: string;
    startTime: string;
    endTime: string;
    resourceId?: number | null;
    backColor?: string | null;
    providerId?: string | null;
};

export type UpdateBlockedTimeDto = {
    reason?: string | null;
    startTime?: string;
    endTime?: string;
    resourceId?: number | null;
    clearResource?: boolean;
    backColor?: string | null;
};

type ApiError = { code?: string; message?: string };

function mapCreateUpdateError(err: any): never {
    const p: ApiError | undefined = err?.response?.data;
    if (p?.code === "RESERVATION_CONFLICT") throw new Error(p.message ?? "This block overlaps one or more reservations.");
    if (p?.code === "BLOCK_OVERLAP") throw new Error(p.message ?? "This block overlaps an existing block.");
    throw err;
}

export async function getBlockedTimes(params: { start?: string; end?: string }): Promise<BlockedTimeDto[]> {
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
        mapCreateUpdateError(err);
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
        mapCreateUpdateError(err);
    }
}

export async function deleteBlockedTime(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.delete(`/blocked-times/${id}`);
    if (opts.toastSuccess) toast.success("Blocked time deleted.");
}

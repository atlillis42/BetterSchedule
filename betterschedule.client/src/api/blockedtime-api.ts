import { api } from "@auth/axios";

export interface BlockedTimeDto {
    id: number;
    reason: string;
    startTime: string; // ISO string
    endTime: string;   // ISO string
    resourceId?: number;
    backColor?: string;
    isDeleted: boolean;
}

export interface CreateBlockedTimeDto {
    reason: string;
    startTime: string;
    endTime: string;
    resourceId?: number;
    backColor?: string;
}

export async function getBlockedTimes(params?: { start: string; end: string }): Promise<BlockedTimeDto[]> {
    const { data } = await api.get<BlockedTimeDto[]>("/calendar/blockedtimes", { params });
    return data;
}

export async function getAllBlockedTimes(): Promise<BlockedTimeDto[]> {
    const { data } = await api.get<BlockedTimeDto[]>("/calendar/blockedtimes/all");
    return data;
}

export async function createBlockedTime(payload: CreateBlockedTimeDto): Promise<BlockedTimeDto> {
    const { data } = await api.post("/calendar/blockedtimes", payload);
    return data;
}

export async function updateBlockedTime(id: number, payload: CreateBlockedTimeDto): Promise<void> {
    await api.put(`/calendar/blockedtimes/${id}`, payload);
}

export async function deleteBlockedTime(id: number): Promise<void> {
    await api.delete(`/calendar/blockedtimes/${id}`);
}

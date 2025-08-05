import { api } from "@auth/axios";

export interface CalendarResourceDto {
    id: number;
    name: string;
    backColor?: string;
}

export async function getResources(): Promise<CalendarResourceDto[]> {
    const { data } = await api.get<CalendarResourceDto[]>("/calendar/resources");
    return data;
}

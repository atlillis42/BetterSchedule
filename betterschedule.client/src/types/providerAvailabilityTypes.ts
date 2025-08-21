export type DayOfWeek =
    | "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface ProviderAvailabilityDto {
    id: number;
    organizationId: string;
    serviceProviderId: string;
    dayOfWeek: DayOfWeek;
    startLocalTime: string;   // "HH:mm:ss" from API
    endLocalTime: string;     // "HH:mm:ss"
    effectiveFrom: string;    // "YYYY-MM-DD"
    effectiveTo: string;      // "YYYY-MM-DD"
    isDeleted: boolean;
}

export interface CreateProviderAvailabilityDto {
    serviceProviderId: string;
    dayOfWeek: DayOfWeek;
    startLocalTime: string;   // "HH:mm" or "HH:mm:ss"
    endLocalTime: string;
    effectiveFrom: string;    // "YYYY-MM-DD"
    effectiveTo: string;      // "YYYY-MM-DD"
}

export interface UpdateProviderAvailabilityDto {
    serviceProviderId?: string;
    dayOfWeek?: DayOfWeek;
    startLocalTime?: string;
    endLocalTime?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
}

export interface UpsertProviderAvailabilityDto extends CreateProviderAvailabilityDto {
    id?: number;
}

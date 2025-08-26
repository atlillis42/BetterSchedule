import { api } from "@auth/axios";

/**
 * Package catalog item (what the org can grant/sell).
 * Server may include friendly names for convenience.
 */
export type PackageDto = {
    id: number;
    organizationId: string;

    name: string;

    /** Single-type packages for MVP */
    appointmentTypeId: number;
    appointmentTypeName?: string | null;

    /** How many uses the package includes */
    totalUses: number;

    /** If true, the package can only be used with one provider */
    providerLocked: boolean;
    providerId?: string | null;
    providerName?: string | null;

    /** Optional relative expiry in days (computed to an absolute date at grant-time) */
    expiresAfterDays?: number | null;

    isActive: boolean;

    createdAt: string; // ISO
};

/** Create payload */
export type CreatePackageDto = {
    name: string;
    appointmentTypeId: number;
    totalUses: number;

    providerLocked?: boolean;
    providerId?: string | null;

    //** null/undefined => no expiry */
    expiresAfterDays?: number | null;

    //** default true if omitted */
    isActive?: boolean;
};

/** Update payload (partial) */
export type UpdatePackageDto = Partial<{
    name: string;
    appointmentTypeId: number;
    totalUses: number;

    providerLocked: boolean;
    providerId: string | null;

    expiresAfterDays: number | null;

    isActive: boolean;
}>;

/** GET /packages */
export async function listPackages(params?: {
    activeOnly?: boolean;
    appointmentTypeId?: number;
}): Promise<PackageDto[]> {
    const { data } = await api.get<PackageDto[]>("/packages", { params });
    return data;
}

/** Get single package. */
export async function getPackage(id: number): Promise<PackageDto> {
    const { data } = await api.get<PackageDto>(`/packages/${id}`);
    return data;
}

/** POST /packages */
export async function createPackage(payload: CreatePackageDto): Promise<PackageDto> {
    const { data } = await api.post<PackageDto>("/packages", payload);
    return data;
}

/** PUT /packages/{id} */
export async function updatePackage(id: number, payload: UpdatePackageDto): Promise<void> {
    await api.put(`/packages/${id}`, payload);
}

/** DELETE /packages/{id} (soft delete on server) */
export async function deletePackage(id: number): Promise<void> {
    await api.delete(`/packages/${id}`);
}

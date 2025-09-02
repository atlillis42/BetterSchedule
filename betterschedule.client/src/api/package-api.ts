import { api } from "@auth/axios";

/**
 * Read model for an organization-scoped package template.
 * Grants a fixed number of uses for a single appointment type.
 *
 * @remarks
 * - Server may enrich rows with friendly names (e.g., `appointmentTypeName`, `providerName`).
 * - `expiresAfterDays` is a relative policy applied at grant time; assignments store the absolute timestamp.
 * - Delete is implemented as a soft “turn off” (`isActive=false`) on the server.
 */
export type PackageDto = {
    /** Identifier of the package. */
    id: number;

    /** Owning organization identifier. */
    organizationId: string;

    /** Display name. Unique within an organization (case-insensitive). */
    name: string;

    /** Appointment type this package applies to (single-type for MVP). */
    appointmentTypeId: number;

    /** Optional friendly name for UI convenience. */
    appointmentTypeName?: string | null;

    /** Total number of uses the package grants. */
    totalUses: number;

    /** Whether usage is restricted to a specific provider. */
    providerLocked: boolean;

    /** Provider identifier when {@link PackageDto.providerLocked} is true. */
    providerId?: string | null;

    /** Optional friendly name for UI convenience. */
    providerName?: string | null;

    /**
     * Optional relative expiry policy in days. If set, the absolute expiry is
     * computed and stored on the assignment at grant time.
     */
    expiresAfterDays?: number | null;

    /** Whether the package is available for assignment. */
    isActive: boolean;

    /** Creation timestamp (ISO). */
    createdAt: string;
};

/**
 * Create payload for a new package.
 *
 * @remarks
 * - `totalUses` must be > 0.
 * - When `providerLocked` is true, `providerId` must be supplied.
 * - If `expiresAfterDays` is omitted/`null`, the grant will not carry an expiry.
 */
export type CreatePackageDto = {
    /** Display name (unique within org). */
    name: string;

    /** Appointment type to which this package applies. */
    appointmentTypeId: number;

    /** Total number of uses the package grants (>0). */
    totalUses: number;

    /** Lock usage to a single provider (default: false). */
    providerLocked?: boolean;

    /** Provider identifier when {@link CreatePackageDto.providerLocked} is true. */
    providerId?: string | null;

    /** Relative expiry policy in days; `null`/`undefined` = no expiry. */
    expiresAfterDays?: number | null;

    /** Initial active state (default: true). */
    isActive?: boolean;
};

/**
 * Patch-style update payload for an existing package.
 * Provide only the fields to change.
 */
export type UpdatePackageDto = Partial<{
    name: string;
    appointmentTypeId: number;
    totalUses: number;
    providerLocked: boolean;
    providerId: string | null;
    expiresAfterDays: number | null;
    isActive: boolean;
}>;

/** Narrow API error shape used by server responses. */
type ApiErrorPayload = { code?: string; message?: string };

/** Normalizes axios errors to clean `Error` instances with a user-friendly message. */
function handleApiError(err: unknown, fallback: string): never {
    const p: ApiErrorPayload | undefined = (err as any)?.response?.data;
    const message = (p?.message as string) || fallback;
    throw new Error(message);
}

/**
 * Lists packages in the organization.
 *
 * @param params Optional filters:
 * - `activeOnly` — only active packages (server default: all)
 * - `appointmentTypeId` — restrict to a single appointment type
 */
export async function listPackages(params?: {
    activeOnly?: boolean;
    appointmentTypeId?: number;
}): Promise<PackageDto[]> {
    try {
        const { data } = await api.get<PackageDto[]>("/packages", { params });
        return data;
    } catch (err) {
        handleApiError(err, "Failed to load packages.");
    }
}

/** Retrieves a single package by identifier. */
export async function getPackage(id: number): Promise<PackageDto> {
    try {
        const { data } = await api.get<PackageDto>(`/packages/${id}`);
        return data;
    } catch (err) {
        handleApiError(err, "Failed to load package.");
    }
}

/**
 * Creates a new package.
 *
 * @returns The created {@link PackageDto}.
 */
export async function createPackage(payload: CreatePackageDto): Promise<PackageDto> {
    try {
        const { data } = await api.post<PackageDto>("/packages", payload);
        return data;
    } catch (err) {
        handleApiError(err, "Failed to create package.");
    }
}

/** Updates an existing package (patch semantics). */
export async function updatePackage(id: number, payload: UpdatePackageDto): Promise<void> {
    try {
        await api.put(`/packages/${id}`, payload);
    } catch (err) {
        handleApiError(err, "Failed to update package.");
    }
}

/**
 * Soft-removes a package (server sets `isActive=false`).
 * Existing assignments continue to function until they expire or run out.
 */
export async function deletePackage(id: number): Promise<void> {
    try {
        await api.delete(`/packages/${id}`);
    } catch (err) {
        handleApiError(err, "Failed to turn off package.");
    }
}

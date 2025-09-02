import { api } from "@auth/axios";

/**
 * Read model for a package assignment owned by a specific client.
 * Carries snapshot fields from the package and mutable counters.
 *
 * @remarks
 * - `totalUses` is the snapshot at grant time; `remainingUses` counts down with redemptions.
 * - `expiresAtUtc` is an absolute UTC timestamp if the assignment is time-limited.
 */
export type PackageAssignmentDto = {
    /** Identifier of the assignment. */
    id: number;

    /** Owning organization identifier. */
    organizationId: string;

    /** Client identifier. */
    clientId: string;

    /** Source package identifier. */
    packageId: number;

    /** Snapshot of the package name at grant time. */
    packageName: string;

    /** Snapshot: appointment type the package applies to. */
    appointmentTypeId: number;

    /** Current remaining uses (never negative). */
    remainingUses: number;

    /** Snapshot of the total uses granted by the package. */
    totalUses: number;

    /** Grant timestamp (ISO). */
    grantedAt: string;

    /** Absolute expiry (ISO UTC) if the assignment expires. */
    expiresAtUtc?: string | null;

    /** Soft-delete flag. */
    isDeleted: boolean;
};

/**
 * Command to grant a package to a client.
 *
 * @remarks
 * - The server validates org membership, package activity, provider lock, and expiry policy.
 */
export type GrantPackageDto = {
    /** Client identifier receiving the package. */
    clientId: string;

    /** Package identifier to grant. */
    packageId: number;
};

/**
 * Eligible assignments for a booking context.
 * These are the client’s assignments that are usable for the given appointment type
 * (and, when provided, the given provider).
 */
export type EligibleAssignmentDto = PackageAssignmentDto;

/**
 * Lists usable assignments for a client in a booking context.
 * GET `/package-assignments/eligible?clientId=&appointmentTypeId=&providerId=`
 */
export async function listEligibleAssignments(params: {
    clientId: string;
    appointmentTypeId: number;
    providerId?: string;
}): Promise<EligibleAssignmentDto[]> {
    const { data } = await api.get<EligibleAssignmentDto[]>("/package-assignments/eligible", {
        params,
    });
    return data;
}

/**
 * Lists all assignments for a client (admin convenience).
 * GET `/package-assignments/by-client/{clientId}`
 */
export async function listAssignmentsByClient(clientId: string): Promise<PackageAssignmentDto[]> {
    const { data } = await api.get<PackageAssignmentDto[]>(`/package-assignments/by-client/${clientId}`);
    return data;
}

/**
 * Grants a package to a client.
 * POST `/package-assignments/grant`
 */
export async function grantPackage(payload: GrantPackageDto): Promise<PackageAssignmentDto> {
    const { data } = await api.post<PackageAssignmentDto>("/package-assignments/grant", payload);
    return data;
}

/* ------------------------------------------------------------------ */
/* UI helpers                                                         */
/* ------------------------------------------------------------------ */

/**
 * Formats a compact label for select controls (e.g., a booking modal).
 * Example: `"10-Pack — 3/10 left • exp 12/31/2026"`.
 */
export function formatAssignmentLabel(a: PackageAssignmentDto): string {
    const expires = a.expiresAtUtc ? ` • exp ${new Date(a.expiresAtUtc).toLocaleDateString()}` : "";
    return `${a.packageName} — ${a.remainingUses}/${a.totalUses} left${expires}`;
}

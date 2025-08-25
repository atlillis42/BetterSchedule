import { api } from "@auth/axios";

/**
 * A package owned by a specific client (mutable counters).
 */
export type PackageAssignmentDto = {
    id: number;
    organizationId: string;

    clientId: string;

    packageId: number;
    packageName: string;

    appointmentTypeId: number;

    /** Remaining uses after any redemptions */
    remainingUses: number;

    /** Total uses at grant-time (copy of Package.totalUses for easy display) */
    totalUses: number;

    grantedAt: string;      // ISO
    expiresAtUtc?: string | null; // ISO absolute expiry (if any)

    isDeleted: boolean;
};

/** Input to grant/issue a package to a client */
export type GrantPackageDto = {
    clientId: string;
    packageId: number;
};

/**
 * Eligible assignments response.
 * These are the client’s assignments that can be used
 * for a given appointment type (and optionally provider).
 */
export type EligibleAssignmentDto = PackageAssignmentDto;

/** GET /package-assignments/eligible?clientId=&appointmentTypeId=&providerId= */
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

/** Convenience: list all assignments for a client (optional but handy in admin) */
/** GET /package-assignments/by-client/{clientId} */
export async function listAssignmentsByClient(clientId: string): Promise<PackageAssignmentDto[]> {
    const { data } = await api.get<PackageAssignmentDto[]>(`/package-assignments/by-client/${clientId}`);
    return data;
}

/** POST /package-assignments/grant */
export async function grantPackage(payload: GrantPackageDto): Promise<PackageAssignmentDto> {
    const { data } = await api.post<PackageAssignmentDto>("/package-assignments/grant", payload);
    return data;
}

/* -------------------- UI helpers (optional) -------------------- */

/** Compact label for selects like the EventModal package dropdown */
export function formatAssignmentLabel(a: PackageAssignmentDto): string {
    const expires =
        a.expiresAtUtc ? ` • exp ${new Date(a.expiresAtUtc).toLocaleDateString()}` : "";
    return `${a.packageName} — ${a.remainingUses}/${a.totalUses} left${expires}`;
}

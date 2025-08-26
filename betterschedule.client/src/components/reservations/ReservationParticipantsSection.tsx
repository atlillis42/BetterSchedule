import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
    listParticipants,
    addParticipant,
    removeParticipant,
    type ReservationParticipantDto,
    type AddReservationParticipantDto,
} from "@/api/reservation-participants-api";

type Props = {
    reservationId?: number;             // hide section when creating a new reservation (no id yet)
    primaryClientId: string;            // reservation.clientId
    primaryProviderId: string;          // reservation.serviceProviderId
    canEdit: boolean;                   // manager/provider context
    // Optional name resolver: map userId -> display name (e.g., from your user lookup cache)
    resolveUserName?: (userId: string) => string | undefined;
};

const RoleBadge: React.FC<{ label: string }> = ({ label }) => (
    <span className="px-2 py-1 text-[11px] rounded-full border bg-white">{label}</span>
);

export const ReservationParticipantsSection: React.FC<Props> = ({
    reservationId,
    primaryClientId,
    primaryProviderId,
    canEdit,
    resolveUserName,
}) => {
    const [items, setItems] = useState<ReservationParticipantDto[]>([]);
    const [loading, setLoading] = useState(false);

    // minimal add inputs (replace with your ClientSearchInput/Provider picker later)
    const [clientUserId, setClientUserId] = useState("");
    const [providerUserId, setProviderUserId] = useState("");
    const [guestName, setGuestName] = useState("");
    const [guestPhone, setGuestPhone] = useState("");

    const hasReservation = typeof reservationId === "number" && reservationId > 0;

    async function refresh() {
        if (!hasReservation) return;
        setLoading(true);
        try {
            const data = await listParticipants(reservationId!);
            setItems(data);
        } catch {
            toast.error("Failed to load participants");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reservationId]);

    const counts = useMemo(() => {
        let clients = primaryClientId ? 1 : 0;
        let providers = primaryProviderId ? 1 : 0;
        items.forEach((p) => {
            if (p.role === "Client") clients++;
            if (p.role === "ServiceProvider") providers++;
        });
        return { clients, providers };
    }, [items, primaryClientId, primaryProviderId]);

    function wouldBreakMinimumAfterRemoval(p: ReservationParticipantDto) {
        if (p.role === "Client" && counts.clients <= 1) return true;
        if (p.role === "ServiceProvider" && counts.providers <= 1) return true;
        return false;
    }

    async function handleAdd(payload: AddReservationParticipantDto) {
        try {
            await addParticipant(reservationId!, payload);
            toast.success("Participant added");
            await refresh();
        } catch (error: any) {
            const code = error?.response?.data?.code as string | undefined;
            const message =
                (error?.response?.data?.message as string | undefined) ||
                (error?.message as string | undefined) ||
                "Failed to add participant";
            if (code === "UNAVAILABLE") {
                toast.error(message);
            } else {
                toast.error(message);
            }
        }
    }

    async function handleRemove(p: ReservationParticipantDto) {
        if (wouldBreakMinimumAfterRemoval(p)) {
            toast.warn("Reservation must have at least one client and one provider.");
            return;
        }
        try {
            await removeParticipant(reservationId!, p.id);
            toast.success("Participant removed");
            await refresh();
        } catch {
            toast.error("Failed to remove participant");
        }
    }

    if (!hasReservation) {
        // New reservation: participants are not applicable until the reservation exists.
        return null;
    }

    return (
        <section className="flex flex-col gap-4">
            <header className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Participants</h3>
                <div className="text-xs text-gray-600">
                    Clients: {counts.clients} • Providers: {counts.providers}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Primary roles (read-only) */}
                <div className="p-3 rounded-xl border bg-white">
                    <div className="text-sm font-medium mb-2">Primary</div>
                    <div className="flex flex-wrap gap-2">
                        <RoleBadge label={`Client • ${resolveUserName?.(primaryClientId) ?? primaryClientId}`} />
                        <RoleBadge label={`Provider • ${resolveUserName?.(primaryProviderId) ?? primaryProviderId}`} />
                    </div>
                </div>

                {/* Additional participants */}
                <div className="p-3 rounded-xl border bg-white md:col-span-2">
                    <div className="text-sm font-medium mb-2">Additional</div>
                    {loading ? (
                        <div className="text-sm text-gray-500">Loading…</div>
                    ) : items.length === 0 ? (
                        <div className="text-sm text-gray-500">No additional participants.</div>
                    ) : (
                        <ul className="flex flex-wrap gap-2">
                            {items.map((p) => {
                                const label =
                                    p.role === "Guest"
                                        ? `${p.guestName ?? "Guest"}${p.guestPhone ? " • " + p.guestPhone : ""}`
                                        : resolveUserName?.(p.userId) ?? p.userId;
                                return (
                                    <li key={p.id} className="flex items-center gap-2 px-2 py-1 rounded-full border bg-white">
                                        <span className="text-[11px]">{p.role}</span>
                                        <span className="text-[11px] text-gray-600">{label}</span>
                                        {canEdit && (
                                            <button
                                                className="text-[11px] underline text-red-600"
                                                onClick={() => void handleRemove(p)}
                                                title="Remove participant"
                                            >
                                                remove
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {canEdit && (
                <div className="p-3 rounded-xl border bg-white">
                    <div className="text-sm font-medium mb-3">Add Participants</div>

                    {/* Replace inputs below with your ClientSearchInput and Provider picker when ready */}
                    <div className="flex flex-col md:flex-row gap-2 mb-3">
                        <input
                            className="border rounded-lg px-3 py-2 flex-1"
                            placeholder="Client user id (replace with ClientSearchInput)"
                            value={clientUserId}
                            onChange={(e) => setClientUserId(e.target.value)}
                        />
                        <button
                            className="rounded-lg border px-3 py-2"
                            onClick={() => clientUserId && handleAdd({ role: "Client", userId: clientUserId })}
                        >
                            Add Client
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 mb-3">
                        <input
                            className="border rounded-lg px-3 py-2 flex-1"
                            placeholder="Provider user id (replace with Provider picker)"
                            value={providerUserId}
                            onChange={(e) => setProviderUserId(e.target.value)}
                        />
                        <button
                            className="rounded-lg border px-3 py-2"
                            onClick={() =>
                                providerUserId && handleAdd({ role: "ServiceProvider", userId: providerUserId })
                            }
                        >
                            Add Provider
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2">
                        <input
                            className="border rounded-lg px-3 py-2 flex-1"
                            placeholder="Guest name"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                        />
                        <input
                            className="border rounded-lg px-3 py-2 flex-1"
                            placeholder="Guest phone"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                        />
                        <button
                            className="rounded-lg border px-3 py-2"
                            onClick={() => guestName && handleAdd({ role: "Guest", guestName, guestPhone })}
                        >
                            Add Guest
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ReservationParticipantsSection;
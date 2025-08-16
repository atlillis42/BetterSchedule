import { useEffect, useState } from "react";
import { useAuth } from "@auth/AuthContext";
import { isManager } from "@auth/roles";
import { getProvidersLite, type UserLite } from "@/api/user-api";
import {
    getProviderAvailability,
    bulkUpsertProviderAvailability,
    type ProviderAvailabilityDto,
    type UpsertProviderAvailabilityDto
} from "@/api/provider-availability-api";
import { toast } from "react-toastify";

const dayOrder = [
    { label: "Monday", value: 1 },
    { label: "Tuesday", value: 2 },
    { label: "Wednesday", value: 3 },
    { label: "Thursday", value: 4 },
    { label: "Friday", value: 5 },
    { label: "Saturday", value: 6 },
    { label: "Sunday", value: 0 }
];

export default function ProviderAvailabilityPage() {
    const { roles, userId } = useAuth();

    const [providers, setProviders] = useState<UserLite[]>([]);
    const [providerId, setProviderId] = useState<string>("");
    const [weekly, setWeekly] = useState<any[]>(dayOrder.map(d => ({ dayOfWeek: d.value, startTime: "", endTime: "", id: undefined })));
    const [exceptions, setExceptions] = useState<any[]>([]);

    useEffect(() => {
        const loadProviders = async () => {
            const list = await getProvidersLite();
            setProviders(list);
            if (!isManager(roles) && userId) setProviderId(userId);
        };
        loadProviders();
    }, [roles, userId]);

    useEffect(() => {
        if (providerId) load(providerId);
    }, [providerId]);

    const load = async (id: string) => {
        const data = await getProviderAvailability(id);
        const w = dayOrder.map(d => ({ dayOfWeek: d.value, startTime: "", endTime: "", id: undefined }));
        const ex: any[] = [];
        data.forEach((a: ProviderAvailabilityDto) => {
            if (a.isException) {
                ex.push({ id: a.id, date: a.exceptionDate ?? "", startTime: a.startTime, endTime: a.endTime });
            } else {
                const idx = dayOrder.findIndex(d => d.value === a.dayOfWeek);
                if (idx >= 0) w[idx] = { id: a.id, dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime };
            }
        });
        setWeekly(w);
        setExceptions(ex);
    };

    const updateWeekly = (idx: number, field: string, value: string) => {
        setWeekly(prev => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    const updateException = (idx: number, field: string, value: string) => {
        setExceptions(prev => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    const addException = () => setExceptions(ex => [...ex, { date: "", startTime: "", endTime: "" }]);

    const handleSave = async () => {
        if (!providerId) return;
        const payload: UpsertProviderAvailabilityDto[] = [
            ...weekly.filter(w => w.startTime && w.endTime).map(w => ({
                id: w.id,
                dayOfWeek: w.dayOfWeek,
                startTime: w.startTime,
                endTime: w.endTime,
                isException: false
            })),
            ...exceptions.filter(e => e.date && e.startTime && e.endTime).map(e => ({
                id: e.id,
                startTime: e.startTime,
                endTime: e.endTime,
                isException: true,
                exceptionDate: e.date
            }))
        ];
        try {
            await bulkUpsertProviderAvailability(providerId, payload);
            toast.success("Availability saved.");
            load(providerId);
        } catch {
            toast.error("Failed to save availability.");
        }
    };

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-lg font-semibold">Provider Availability</h2>

            {isManager(roles) && (
                <select
                    className="border rounded p-2"
                    value={providerId}
                    onChange={e => setProviderId(e.target.value)}
                >
                    <option value="">Select Provider</option>
                    {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            )}

            {providerId ? (
                <>
                    <table className="w-full border text-sm">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="p-2 text-left">Day</th>
                                <th className="p-2 text-center">Start</th>
                                <th className="p-2 text-center">End</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dayOrder.map((d, i) => (
                                <tr key={d.value} className="border-t">
                                    <td className="p-2">{d.label}</td>
                                    <td className="p-2 text-center">
                                        <input
                                            type="time"
                                            step={60}
                                            className="border rounded p-1"
                                            value={weekly[i].startTime}
                                            onChange={e => updateWeekly(i, "startTime", e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2 text-center">
                                        <input
                                            type="time"
                                            step={60}
                                            className="border rounded p-1"
                                            value={weekly[i].endTime}
                                            onChange={e => updateWeekly(i, "endTime", e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-4 space-y-2">
                        <h3 className="font-medium">Exceptions</h3>
                        {exceptions.map((ex, i) => (
                            <div key={i} className="flex gap-2">
                                <input
                                    type="date"
                                    className="border rounded p-1"
                                    value={ex.date}
                                    onChange={e => updateException(i, "date", e.target.value)}
                                />
                                <input
                                    type="time"
                                    step={60}
                                    className="border rounded p-1"
                                    value={ex.startTime}
                                    onChange={e => updateException(i, "startTime", e.target.value)}
                                />
                                <input
                                    type="time"
                                    step={60}
                                    className="border rounded p-1"
                                    value={ex.endTime}
                                    onChange={e => updateException(i, "endTime", e.target.value)}
                                />
                            </div>
                        ))}
                        <button className="px-3 py-1 border rounded" onClick={addException}>
                            + Add Exception
                        </button>
                    </div>

                    <div>
                        <button
                            className="bg-blue-600 text-white px-3 py-1.5 rounded"
                            onClick={handleSave}
                        >
                            Save
                        </button>
                    </div>
                </>
            ) : (
                <div className="text-sm text-gray-600">Select a provider to manage availability.</div>
            )}
        </div>
    );
}
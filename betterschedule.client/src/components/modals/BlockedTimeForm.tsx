import React from "react";

type CalendarResource = { id: number; name: string };

export default function BlockedTimeForm(props: {
    mode: "create" | "edit";
    values: any;
    setValues: (updater: (prev: any) => any) => void;
    resources: CalendarResource[];
}) {
    const { values, setValues, resources } = props;

    const handleField = (key: string, value: unknown) => {
        setValues((prev: any) => ({ ...prev, [key]: value }));
    };
    const handleSelectNumber = (key: string, value: string) => {
        setValues((prev: any) => ({ ...prev, [key]: value ? Number(value) : undefined }));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Resource (optional)</label>
                <select
                    className="border rounded-lg px-3 py-2"
                    value={values.resourceId != null ? String(values.resourceId) : ""}
                    onChange={(e) => handleSelectNumber("resourceId", e.target.value)}
                >
                    <option value="">None</option>
                    {resources.map((r) => (
                        <option key={r.id} value={String(r.id)}>{r.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Reason</label>
                <input
                    className="border rounded-lg px-3 py-2"
                    value={values.reason || ""}
                    onChange={(e) => handleField("reason", e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Start</label>
                <div className="flex gap-2">
                    <input
                        type="date"
                        className="border rounded-lg px-3 py-2 w-1/2"
                        value={values.startDate || ""}
                        onChange={(e) => handleField("startDate", e.target.value)}
                    />
                    <input
                        type="time"
                        className="border rounded-lg px-3 py-2 w-1/2"
                        value={values.startTime || ""}
                        onChange={(e) => handleField("startTime", e.target.value)}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">End</label>
                <div className="flex gap-2">
                    <input
                        type="date"
                        className="border rounded-lg px-3 py-2 w-1/2"
                        value={values.endDate || ""}
                        onChange={(e) => handleField("endDate", e.target.value)}
                    />
                    <input
                        type="time"
                        className="border rounded-lg px-3 py-2 w-1/2"
                        value={values.endTime || ""}
                        onChange={(e) => handleField("endTime", e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}

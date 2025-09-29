import React, { useMemo } from "react";
import Select, { type SingleValue } from "react-select";

type CalendarResource = { id: number; name: string };
type NumberOption = { value: number; label: string };

type Props = {
    values: any;
    setValues: (updater: (prev: any) => any) => void;
    resources: CalendarResource[];
};

const BlockedTimeModal: React.FC<Props> = ({ values, setValues, resources }) => {
    const resourceOptionsRS: NumberOption[] = useMemo(
        () => (resources ?? []).map((r) => ({ value: r.id, label: r.name })),
        [resources]
    );

    const selectedResourceOption: NumberOption | null = useMemo(() => {
        if (values?.resourceId == null) return null;
        const id = Number(values.resourceId);
        return resourceOptionsRS.find((o) => o.value === id) ?? null;
    }, [values?.resourceId, resourceOptionsRS]);

    const handleField = (key: string, value: unknown) => {
        setValues((prev: any) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Resource (optional)</label>
                <Select
                    className="text-sm"
                    classNamePrefix="rs"
                    options={resourceOptionsRS}
                    value={selectedResourceOption}
                    onChange={(option: SingleValue<NumberOption>) => handleField("resourceId", option?.value ?? undefined)}
                    isClearable
                    placeholder="None"
                    noOptionsMessage={() => "No resources"}
                />
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
};

export default BlockedTimeModal;

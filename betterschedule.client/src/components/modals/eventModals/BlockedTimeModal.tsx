import React, { useMemo } from "react";
import Select, { type SingleValue } from "react-select";
import ProviderSearchInput from "@/components/modals/lookup/ProviderSearchInput";

type CalendarResource = { id: number; name: string };
type NumberOption = { value: number; label: string };

type Props = {
    values: any;
    setValues: (updater: (prev: any) => any) => void;
    resources: CalendarResource[];   
    isManager: boolean;
    isProvider: boolean;
};

const BlockedTimeModal: React.FC<Props> = ({ values, setValues, resources, isManager, isProvider }) => {
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

    // Mutual exclusivity (manager UX): picking a provider clears resource, and vice versa
    const handleProviderPicked = (p: { id: string } | null) => {
        setValues((prev: any) => ({
            ...prev,
            providerId: p?.id ?? undefined,
            resourceId: p ? undefined : prev.resourceId, // if provider chosen => clear resource
        }));
    };

    const handleResourcePicked = (option: SingleValue<NumberOption>) => {
        const rid = option?.value ?? undefined;
        setValues((prev: any) => ({
            ...prev,
            resourceId: rid,
            providerId: rid ? undefined : prev.providerId, // if resource chosen => clear provider
        }));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Manager-only targeting controls */}
            {isManager && (
                <>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Block for provider (optional)</label>
                        <ProviderSearchInput
                            valueId={typeof values.providerId === "string" ? values.providerId : null}
                            initialLabel={values.providerName ?? null}
                            onChange={handleProviderPicked}
                            placeholder="Search providers…"
                            disabled={!!values.resourceId} // disabled if resource chosen
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            Choose a provider <em>or</em> choose a resource below.
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Resource (optional)</label>
                        <Select
                            className="text-sm"
                            classNamePrefix="rs"
                            options={resourceOptionsRS}
                            value={selectedResourceOption}
                            onChange={handleResourcePicked}
                            isClearable
                            placeholder="None"
                            noOptionsMessage={() => "No resources"}
                            isDisabled={!!values.providerId} // disabled if provider chosen
                        />
                    </div>
                </>
            )}

            {/* Providers: no targeting controls (always block self; no resource) */}
            {isProvider && !isManager && (
                <div className="md:col-span-2 rounded border bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    This block will apply to <strong>your</strong> schedule. Providers cannot block resources.
                </div>
            )}

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

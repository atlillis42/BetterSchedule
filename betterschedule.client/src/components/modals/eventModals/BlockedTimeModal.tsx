import React, { useMemo } from "react";
import Select, { type SingleValue } from "react-select";
import ProviderSearchInput from "@/components/modals/lookup/ProviderSearchInput";
import { useAuth } from "@/components/auth/auth-context";
import { buildReactSelectStyles } from "@/styles/reactSelectStyles"; 

type CalendarResource = { id: number; name: string };
type NumberOption = { value: number; label: string };

type Props = {
    values: any;
    setValues: (updater: (prev: any) => any) => void;
    resources: CalendarResource[];
};

const BlockedTimeModal: React.FC<Props> = ({ values, setValues, resources }) => {
    const { isManager, isProvider } = useAuth();
    const role = isManager ? "manager" : isProvider ? "provider" : "other";

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

    // Manager-only targeting: choose provider OR resource (mutually exclusive)
    const handleProviderPicked = (p: { id: string } | null) => {
        setValues((prev: any) => ({
            ...prev,
            providerId: p?.id ?? undefined,
            providerName: p ? undefined : prev.providerName,
            resourceId: p ? undefined : prev.resourceId,
        }));
    };

    const handleResourcePicked = (option: SingleValue<NumberOption>) => {
        const rid = option?.value ?? undefined;
        setValues((prev: any) => ({
            ...prev,
            resourceId: rid,
            providerId: rid ? undefined : prev.providerId,
        }));
    };

    const menuPortalTarget =
        typeof document !== "undefined"
            ? (document.querySelector(".bs-modal") as HTMLElement) ?? document.body
            : undefined;

    // NEW: unified react-select styles using CSS vars
    const rsStyles = useMemo(() => buildReactSelectStyles<NumberOption>(), []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {role === "manager" && (
                <>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            Block for provider (optional)
                        </label>
                        <ProviderSearchInput
                            valueId={typeof values.providerId === "string" ? values.providerId : null}
                            initialLabel={values.providerName ?? null}
                            onChange={handleProviderPicked}
                            placeholder="Search providers…"
                            disabled={!!values.resourceId}
                        />
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Choose a provider <em>or</em> a resource below (not both).
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            Resource (optional)
                        </label>
                        <Select
                            className="text-sm rs-container"
                            classNamePrefix="rs"
                            options={resourceOptionsRS}
                            value={selectedResourceOption}
                            onChange={handleResourcePicked}
                            isClearable
                            placeholder="None"
                            noOptionsMessage={() => "No resources"}
                            isDisabled={!!values.providerId}
                            menuPortalTarget={menuPortalTarget}   // NEW
                            menuPosition="fixed"                   // NEW
                            styles={rsStyles}                      // NEW
                        />
                    </div>
                </>
            )}

            {role === "provider" && (
                <div className="md:col-span-2 rounded border px-3 py-2 text-xs text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-200">
                    This block will apply to <strong>your</strong> schedule. Providers cannot block resources.
                </div>
            )}

            <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Reason</label>
                <input
                    className="border rounded-lg px-3 py-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400
                     dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400"
                    value={values.reason || ""}
                    onChange={(e) => handleField("reason", e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Start</label>
                <div className="flex gap-2">
                    <input
                        type="date"
                        className="border rounded-lg px-3 py-2 w-1/2 border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        value={values.startDate || ""}
                        onChange={(e) => handleField("startDate", e.target.value)}
                    />
                    <input
                        type="time"
                        className="border rounded-lg px-3 py-2 w-1/2 border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        value={values.startTime || ""}
                        onChange={(e) => handleField("startTime", e.target.value)}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-800 dark:text-slate-200">End</label>
                <div className="flex gap-2">
                    <input
                        type="date"
                        className="border rounded-lg px-3 py-2 w-1/2 border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        value={values.endDate || ""}
                        onChange={(e) => handleField("endDate", e.target.value)}
                    />
                    <input
                        type="time"
                        className="border rounded-lg px-3 py-2 w-1/2 border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        value={values.endTime || ""}
                        onChange={(e) => handleField("endTime", e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};

export default BlockedTimeModal;

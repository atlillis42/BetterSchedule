import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncSelect from "react-select/async";
import type { CSSObjectWithLabel } from "react-select";
import { searchProviders, type ProviderSearchItem, getProviderLiteById } from "@/api/user-api";

export type ProviderPick = { id: string; name: string };

export interface ProviderSearchInputProps {
    /** Current selected provider ID (GUID). Can be null for "no selection". */
    valueId?: string | null;
    /**
     * Optional initial label to use until the control resolves by ID.
     * Useful if an outer DTO already contains providerName.
     */
    initialLabel?: string | null;
    /** Called when user picks (or clears) a provider. */
    onChange: (provider: ProviderPick | null) => void;
    /** Placeholder text. */
    placeholder?: string;
    /** Disable input. */
    disabled?: boolean;
    /** Autofocus input on mount. */
    autoFocus?: boolean;
    /**
     * Exclude these userIds from search results (e.g., already on reservation
     * as client or provider). Accepts Set or string[].
     */
    excludeIds?: Set<string> | string[];
}

/**
 * Provider async typeahead built on react-select/async.
 * - Loads options via `searchProviders(q)`
 * - Resolves initial label by `valueId` via `getProviderLiteById`
 * - Emits `{id, name}` to parent on change
 * - Filters out any ids present in `excludeIds`
 */
const ProviderSearchInput: React.FC<ProviderSearchInputProps> = ({
    valueId,
    initialLabel,
    onChange,
    placeholder = "Search providers…",
    disabled = false,
    autoFocus = false,
    excludeIds,
}) => {
    type Opt = { value: string; label: string };

    // Simple in-memory caches to avoid redundant fetches.
    const idCache = useRef(new Map<string, ProviderSearchItem>());
    const [selected, setSelected] = useState<Opt | null>(null);
    const [defaultOptions, setDefaultOptions] = useState<Opt[]>([]);

    const excluded = useMemo(() => {
        if (!excludeIds) return new Set<string>();
        return excludeIds instanceof Set ? excludeIds : new Set(excludeIds);
    }, [excludeIds]);

    // Map API items to react-select options
    const toOpt = (p: ProviderSearchItem): Opt => ({ value: p.id, label: p.name });

    // Resolve selected label by ID on mount/changes
    useEffect(() => {
        let cancelled = false;

        const hydrate = async () => {
            if (!valueId) {
                setSelected(null);
                return;
            }

            // Use cache first
            const cached = idCache.current.get(valueId);
            if (cached) {
                if (!cancelled) setSelected(toOpt(cached));
                return;
            }

            // Show temporary label if provided while fetching
            if (initialLabel) {
                setSelected({ value: valueId, label: initialLabel });
            }

            try {
                const item = await getProviderLiteById(valueId);
                idCache.current.set(valueId, { id: item.id, name: item.name, availabilityPublic: item.availabilityPublic });
                if (!cancelled) setSelected(toOpt(item));
            } catch {
                // Fall back to showing the GUID if resolution fails
                if (!cancelled && !initialLabel) {
                    setSelected({ value: valueId, label: valueId });
                }
            }
        };

        void hydrate();
        return () => {
            cancelled = true;
        };
    }, [valueId, initialLabel]);

    // Preload a small default options set
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const items = await searchProviders("", { take: 20 });
                const filtered = items.filter(p => !excluded.has(p.id));
                if (!cancelled) setDefaultOptions(filtered.map(toOpt));
                items.forEach((p) => idCache.current.set(p.id, p));
            } catch {
                /* no-op */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [excluded]);

    // Loader for react-select/async
    const loadOptions = useMemo(
        () => async (inputValue: string): Promise<Opt[]> => {
            const items = await searchProviders(inputValue, { take: 20 });
            items.forEach((p) => idCache.current.set(p.id, p));
            return items.filter(p => !excluded.has(p.id)).map(toOpt);
        },
        [excluded]
    );

    const handleChange = (opt: Opt | null) => {
        setSelected(opt);
        if (!opt) {
            onChange(null);
            return;
        }
        onChange({ id: opt.value, name: opt.label });
    };

    // Styling compatible with Tailwind
    const styles = useMemo(
        () => ({
            control: (base: CSSObjectWithLabel) => ({
                ...base,
                minHeight: 40,
                borderRadius: 8,
                borderColor: "#d1d5db", // gray-300
                boxShadow: "none",
                ":hover": { borderColor: "#9ca3af" }, // gray-400
                fontSize: 14,
            }),
            menu: (base: CSSObjectWithLabel) => ({
                ...base,
                zIndex: 9999,
            }),
        }),
        []
    );

    return (
        <AsyncSelect
            inputId="provider-search"
            cacheOptions
            defaultOptions={defaultOptions}
            loadOptions={loadOptions}
            value={selected}
            onChange={(opt) => handleChange(opt as Opt | null)}
            isClearable
            isDisabled={disabled}
            placeholder={placeholder}
            autoFocus={autoFocus}
            styles={styles}
            // ensure the component doesn't submit form on Enter in some contexts
            onKeyDown={(e) => {
                if (e.key === "Enter") e.stopPropagation();
            }}
        />
    );
};

export default ProviderSearchInput;

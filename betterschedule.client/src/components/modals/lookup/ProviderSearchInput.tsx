import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncSelect from "react-select/async";
import { searchProviders, type ProviderSearchItem, getProviderLiteById } from "@/api/user-api";
import { buildReactSelectStyles } from "@/styles/reactSelectStyles"; 

export type ProviderPick = { id: string; name: string };

export interface ProviderSearchInputProps {
    valueId?: string | null;
    initialLabel?: string | null;
    onChange: (provider: ProviderPick | null) => void;
    placeholder?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    excludeIds?: Set<string> | string[];
}

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

    const idCache = useRef(new Map<string, ProviderSearchItem>());
    const [selected, setSelected] = useState<Opt | null>(null);
    const [defaultOptions, setDefaultOptions] = useState<Opt[]>([]);

    const excluded = useMemo(() => {
        if (!excludeIds) return new Set<string>();
        return excludeIds instanceof Set ? excludeIds : new Set(excludeIds);
    }, [excludeIds]);

    const toOpt = (p: { id: string; name: string }): Opt => ({ value: p.id, label: p.name });

    // Portal target inside modal for dark-mode inheritance
    const menuPortalTarget =
        typeof document !== "undefined"
            ? (document.querySelector(".bs-modal") as HTMLElement) ?? document.body
            : undefined;

    // Resolve label for valueId
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!valueId) {
                setSelected(null);
                return;
            }
            const cached = idCache.current.get(valueId);
            if (cached) {
                if (!cancelled) setSelected(toOpt(cached));
                return;
            }
            if (initialLabel) setSelected({ value: valueId, label: initialLabel });
            try {
                const item = await getProviderLiteById(valueId);
                const cachedItem: ProviderSearchItem = {
                    id: item.id,
                    name: item.name,
                    availabilityPublic: (item as any)?.availabilityPublic,
                };
                idCache.current.set(valueId, cachedItem);
                if (!cancelled) setSelected(toOpt(cachedItem));
            } catch {
                if (!cancelled && !initialLabel) setSelected({ value: valueId, label: valueId });
            }
        })();
        return () => { cancelled = true; };
    }, [valueId, initialLabel]);

    // Preload defaults
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const items = await searchProviders("", { take: 20 });
                const filtered = items.filter((p) => !excluded.has(p.id));
                if (!cancelled) setDefaultOptions(filtered.map(toOpt));
                items.forEach((p) => idCache.current.set(p.id, p));
            } catch { /* no-op */ }
        })();
        return () => { cancelled = true; };
    }, [excluded]);

    const loadOptions = useMemo(
        () => async (inputValue: string): Promise<Opt[]> => {
            const items = await searchProviders(inputValue, { take: 20 });
            items.forEach((p) => idCache.current.set(p.id, p));
            return items.filter((p) => !excluded.has(p.id)).map(toOpt);
        },
        [excluded]
    );

    const handleChange = (opt: Opt | null) => {
        setSelected(opt);
        onChange(opt ? { id: opt.value, name: opt.label } : null);
    };

    const styles = useMemo(() => buildReactSelectStyles<Opt>(), []);

    return (
        <AsyncSelect
            inputId="provider-search"
            className="rs-container"
            classNamePrefix="rs"
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
            menuPortalTarget={menuPortalTarget}
            menuPosition="fixed"
            noOptionsMessage={() => "No providers found"}
            onKeyDown={(e) => {
                if (e.key === "Enter") e.stopPropagation();
            }}
        />
    );
};

export default ProviderSearchInput;

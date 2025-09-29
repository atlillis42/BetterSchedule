import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncSelect from "react-select/async";
import type { CSSObjectWithLabel } from "react-select";
import { searchClients, type ClientSearchItem } from "@/api/client-api";
import { getClientLiteById } from "@/api/client-api";

/**
 * Value object for the ClientSearchInput selection.
 */
export type ClientPick = {
    /** Client user identifier (GUID). */
    id: string;
    /** Display name. */
    name: string;
};

export interface ClientSearchInputProps {
    /**
     * Current selected client ID (GUID). Can be null/undefined for "no selection".
     * When provided, the control resolves the display label from the backend.
     */
    valueId?: string | null;
    /**
     * Optional initial label to use *until* the control resolves by ID.
     * Useful if the reservation DTO already contains clientName.
     */
    initialLabel?: string | null;
    /** Called when user picks (or clears) a client. Passes the picked client or null on clear. */
    onChange: (client: ClientPick | null) => void;
    /** Placeholder text. */
    placeholder?: string;
    /** Disable input. */
    disabled?: boolean;
    /** Autofocus input on mount. */
    autoFocus?: boolean;
}

/**
 * Client async typeahead built on react-select/async.
 * - Loads options via `searchClients(q)`
 * - Resolves initial label by `valueId` via `getClientLiteById`
 * - Emits `{id, name}` to parent on change
 */
const ClientSearchInput: React.FC<ClientSearchInputProps> = ({
    valueId,
    initialLabel,
    onChange,
    placeholder = "Search clients…",
    disabled = false,
    autoFocus = false,
}) => {
    type Opt = { value: string; label: string };

    // Simple in-memory caches to avoid redundant fetches.
    const idCache = useRef(new Map<string, ClientSearchItem>());
    const [selected, setSelected] = useState<Opt | null>(null);
    const [defaultOptions, setDefaultOptions] = useState<Opt[]>([]);

    // Map API items to react-select options
    const toOpt = (c: ClientSearchItem): Opt => ({ value: c.id, label: c.name });

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
                const item = await getClientLiteById(valueId);
                idCache.current.set(valueId, item);
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
                const items = await searchClients("", { take: 20 });
                if (!cancelled) setDefaultOptions(items.map(toOpt));
                items.forEach((c) => idCache.current.set(c.id, c));
            } catch {
                /* no-op */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Loader for react-select/async
    const loadOptions = useMemo(
        () => async (inputValue: string): Promise<Opt[]> => {
            const items = await searchClients(inputValue, { take: 20 });
            items.forEach((c) => idCache.current.set(c.id, c));
            return items.map(toOpt);
        },
        []
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
                borderColor: "#d1d5db", // tailwind gray-300
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
            inputId="client-search"
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

export default ClientSearchInput;

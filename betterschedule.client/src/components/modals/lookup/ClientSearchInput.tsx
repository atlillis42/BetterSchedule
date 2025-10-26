import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncSelect from "react-select/async";
import { searchClients, type ClientSearchItem, getClientLiteById } from "@/api/client-api";
import { buildReactSelectStyles } from "@/styles/reactSelectStyles"; 

export type ClientPick = { id: string; name: string };

export interface ClientSearchInputProps {
    valueId?: string | null;
    initialLabel?: string | null;
    onChange: (client: ClientPick | null) => void;
    placeholder?: string;
    disabled?: boolean;
    autoFocus?: boolean;
}

const ClientSearchInput: React.FC<ClientSearchInputProps> = ({
    valueId,
    initialLabel,
    onChange,
    placeholder = "Search clients…",
    disabled = false,
    autoFocus = false,
}) => {
    type Opt = { value: string; label: string };

    const idCache = useRef(new Map<string, ClientSearchItem>());
    const [selected, setSelected] = useState<Opt | null>(null);
    const [defaultOptions, setDefaultOptions] = useState<Opt[]>([]);

    const toOpt = (c: ClientSearchItem): Opt => ({ value: c.id, label: c.name });

    // Portal target inside modal for dark-mode inheritance
    const menuPortalTarget =
        typeof document !== "undefined"
            ? (document.querySelector(".bs-modal") as HTMLElement) ?? document.body
            : undefined;

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
                const item = await getClientLiteById(valueId);
                idCache.current.set(valueId, item);
                if (!cancelled) setSelected(toOpt(item));
            } catch {
                if (!cancelled && !initialLabel) setSelected({ value: valueId, label: valueId });
            }
        })();
        return () => { cancelled = true; };
    }, [valueId, initialLabel]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const items = await searchClients("", { take: 20 });
                if (!cancelled) setDefaultOptions(items.map(toOpt));
                items.forEach((c) => idCache.current.set(c.id, c));
            } catch { /* no-op */ }
        })();
        return () => { cancelled = true; };
    }, []);

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
        onChange(opt ? { id: opt.value, name: opt.label } : null);
    };

    const styles = useMemo(() => buildReactSelectStyles<Opt>(), []);

    return (
        <AsyncSelect
            inputId="client-search"
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
            onKeyDown={(e) => {
                if (e.key === "Enter") e.stopPropagation();
            }}
        />
    );
};

export default ClientSearchInput;

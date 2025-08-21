import { useEffect, useId, useRef, useState } from "react";
import { searchClients, type ClientSearchItem } from "@/api/client-api";

type Props = {
    selected?: ClientSearchItem | null;
    onSelect: (client: ClientSearchItem) => void;
    onClear?: () => void;
    placeholder?: string;
    disabled?: boolean;
};

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

export default function ClientSearchInput({
    selected,
    onSelect,
    onClear,
    placeholder = "Search clients…",
    disabled,
}: Props) {
    const [query, setQuery] = useState<string>(selected?.name ?? "");
    const [results, setResults] = useState<ClientSearchItem[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number>(-1);

    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<number | undefined>(undefined);
    const cacheRef = useRef<Map<string, ClientSearchItem[]>>(new Map());

    const inputId = useId();
    const listboxId = `${inputId}-listbox`;

    // Keep input text in sync with external selection
    useEffect(() => {
        setQuery(selected?.name ?? "");
    }, [selected?.id, selected?.name]);

    // Debounced search
    useEffect(() => {
        if (disabled) return;

        window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(async () => {
            const q = query.trim();

            // Reset when empty or equals selected label
            if (!q || q === (selected?.name ?? "")) {
                setResults([]);
                setLoading(false);
                setActiveIndex(-1);
                return;
            }

            // Min chars guard
            if (q.length < MIN_CHARS) {
                setResults([]);
                setLoading(false);
                setActiveIndex(-1);
                return;
            }

            // Cache hit
            if (cacheRef.current.has(q)) {
                setResults(cacheRef.current.get(q)!);
                setLoading(false);
                setActiveIndex(0);
                return;
            }

            // Cancel in-flight
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            try {
                setLoading(true);
                const data = await searchClients(q, { signal: controller.signal });
                cacheRef.current.set(q, data);
                setResults(data);
                setActiveIndex(data.length > 0 ? 0 : -1);
            } catch {
                setResults([]);
                setActiveIndex(-1);
            } finally {
                setLoading(false);
            }
        }, DEBOUNCE_MS) as unknown as number;

        return () => window.clearTimeout(debounceRef.current);
    }, [query, disabled, selected?.name]);

    // Keyboard interactions
    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            setOpen(true);
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (results.length ? (i + 1) % results.length : -1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : -1));
        } else if (e.key === "Enter") {
            if (open && activeIndex >= 0 && activeIndex < results.length) {
                const choice = results[activeIndex];
                onSelect(choice);
                setQuery(choice.name);
                setResults([]);
                setOpen(false);
                setActiveIndex(-1);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
        }
    };

    const handlePick = (client: ClientSearchItem) => {
        onSelect(client);
        setQuery(client.name);
        setResults([]);
        setOpen(false);
        setActiveIndex(-1);
    };

    return (
        <div className="relative">
            <div className="flex gap-2">
                <input
                    id={inputId}
                    className="w-full border rounded px-3 py-2"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    disabled={disabled}
                    aria-autocomplete="list"
                    aria-expanded={open}
                    aria-controls={listboxId}
                    aria-activedescendant={
                        activeIndex >= 0 && results[activeIndex] ? `${listboxId}-opt-${results[activeIndex].id}` : undefined
                    }
                    role="combobox"
                />

                {selected && (
                    <button
                        type="button"
                        className="px-2 border rounded"
                        onClick={() => {
                            onClear?.();
                            setQuery("");
                            setResults([]);
                            setOpen(false);
                            setActiveIndex(-1);
                        }}
                        disabled={disabled}
                        title="Clear"
                        aria-label="Clear client"
                    >
                        ×
                    </button>
                )}
            </div>

            {open && (loading || results.length > 0 || (query.trim().length >= MIN_CHARS && !loading)) && (
                <div
                    id={listboxId}
                    role="listbox"
                    className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-56 overflow-auto"
                    onMouseDown={(e) => e.preventDefault()} // keep input focus
                >
                    {loading && <div className="p-2 text-sm text-gray-500">Searching…</div>}

                    {!loading &&
                        results.map((client, idx) => (
                            <div
                                key={client.id}
                                id={`${listboxId}-opt-${client.id}`}
                                role="option"
                                aria-selected={idx === activeIndex}
                                className={`px-3 py-2 cursor-pointer ${idx === activeIndex ? "bg-gray-100" : "hover:bg-gray-50"
                                    }`}
                                onMouseEnter={() => setActiveIndex(idx)}
                                onMouseDown={() => handlePick(client)}
                            >
                                {client.name}
                            </div>
                        ))}

                    {!loading && results.length === 0 && query.trim().length >= MIN_CHARS && (
                        <div className="p-2 text-sm text-gray-500">No matches</div>
                    )}
                </div>
            )}
        </div>
    );
}

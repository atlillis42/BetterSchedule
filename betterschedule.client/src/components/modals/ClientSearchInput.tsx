import { useEffect, useRef, useState } from "react";
import { searchClients, type ClientSearchItem } from "@/api/client-api";

type Props = {
    selected?: ClientSearchItem | null;
    onSelect: (client: ClientSearchItem) => void;
    onClear?: () => void;
    placeholder?: string;
    disabled?: boolean;
};

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

    const abortControllerRef = useRef<AbortController | null>(null);
    const debounceTimerRef = useRef<number | undefined>(undefined);

    // Keep input text in sync if parent changes the selected client
    useEffect(() => {
        setQuery(selected?.name ?? "");
    }, [selected?.id, selected?.name]);

    useEffect(() => {
        if (disabled) return;

        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = window.setTimeout(async () => {
            const trimmed = query.trim();

            // Skip searching on empty, or when the visible text already equals the selected label
            if (!trimmed || trimmed === (selected?.name ?? "")) {
                setResults([]);
                setLoading(false);
                return;
            }

            // Cancel the previous in-flight request
            abortControllerRef.current?.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;

            try {
                setLoading(true);
                const data = await searchClients(trimmed, { signal: controller.signal });
                setResults(data);
            } catch {
                // ignore (abort or error); global error handlers/toasts will fire
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 250);

        return () => {
            window.clearTimeout(debounceTimerRef.current);
        };
    }, [query, disabled, selected?.name]);

    return (
        <div className="relative">
            <div className="flex gap-2">
                <input
                    className="w-full border rounded px-3 py-2"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    disabled={disabled}
                    aria-autocomplete="list"
                    aria-expanded={open}
                    aria-controls="client-search-listbox"
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
                        }}
                        disabled={disabled}
                        title="Clear"
                        aria-label="Clear client"
                    >
                        ×
                    </button>
                )}
            </div>

            {open && (loading || results.length > 0 || (query.trim() && !loading)) && (
                <div
                    id="client-search-listbox"
                    role="listbox"
                    className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-56 overflow-auto"
                    onMouseDown={(e) => e.preventDefault()} // keep input focus
                >
                    {loading && (
                        <div className="p-2 text-sm text-gray-500">Searching…</div>
                    )}

                    {!loading && results.map((client) => (
                        <div
                            key={client.id}
                            role="option"
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            onMouseDown={() => {
                                onSelect(client);
                                setQuery(client.name);
                                setResults([]);
                                setOpen(false);
                            }}
                        >
                            {client.name}
                        </div>
                    ))}

                    {!loading && results.length === 0 && query.trim() && (
                        <div className="p-2 text-sm text-gray-500">No matches</div>
                    )}
                </div>
            )}
        </div>
    );
}

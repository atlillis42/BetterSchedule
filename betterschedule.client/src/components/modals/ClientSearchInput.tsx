import { useEffect, useState } from "react";
import { searchClients, type ClientSearchItem } from "@/api/client-api";

type Props = {
    selectedId?: string | null;
    selectedName?: string | null; // optional display label for the selectedId
    onChange: (userId: string | null, displayName: string | null) => void;
    placeholder?: string;
    disabled?: boolean;
};

export default function ClientSearchInput({
    selectedId,
    selectedName,
    onChange,
    placeholder = "Search clients...",
    disabled
}: Props) {
    const [text, setText] = useState<string>(selectedName ?? "");
    const [results, setResults] = useState<ClientSearchItem[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Keep input text in sync when parent changes selection externally
    useEffect(() => {
        setText(selectedName ?? "");
    }, [selectedId, selectedName]);

    // Debounce
    const debouncedText = useDebounce(text, 250);

    useEffect(() => {
        // Don’t search if input text equals the selectedName (prefilled value)
        if (!debouncedText.trim() || debouncedText === (selectedName ?? "")) {
            setResults([]);
            return;
        }

        const ctrl = new AbortController();
        setLoading(true);
        searchClients(debouncedText, { signal: ctrl.signal })
            .then(setResults)
            .catch(() => setResults([]))
            .finally(() => setLoading(false));

        return () => ctrl.abort();
    }, [debouncedText, selectedName]);

    return (
        <div className="relative">
            <input
                className="w-full border rounded p-2"
                placeholder={placeholder}
                value={text}
                onChange={e => { setText(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                disabled={disabled}
            />
            {open && (loading || results.length > 0) && (
                <div className="absolute mt-1 w-full bg-white border rounded shadow z-10 max-h-56 overflow-auto">
                    {loading && <div className="p-2 text-sm text-gray-500">Searching…</div>}
                    {results.map(r => (
                        <div
                            key={r.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onMouseDown={() => {
                                onChange(r.id, r.name);
                                setText(r.name);
                                setOpen(false);
                            }}
                        >
                            {r.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function useDebounce<T>(value: T, delay = 250) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

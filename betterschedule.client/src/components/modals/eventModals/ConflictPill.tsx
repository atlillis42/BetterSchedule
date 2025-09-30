import React from "react";

/**
 * Extract a concise summary:
 * - Prefer the tail after "Conflicts with:" if present.
 * - Otherwise map common messages to friendly summaries.
 * - Finally, fall back to the raw message.
 */
function summarize(message?: string | null): string | null {
    if (!message) return null;

    const tail = message.match(/Conflicts with:\s*([\s\S]+)$/i);
    if (tail) return tail[1].trim();

    if (/overlaps? .*reservation/i.test(message)) return "Conflicts with an existing reservation";
    if (/overlaps? .*block/i.test(message) || /existing block/i.test(message)) return "Conflicts with another blocked time";

    if (/(overlap|conflict)/i.test(message)) return message.trim();

    return null;
}

const ConflictPill: React.FC<{ message?: string | null; className?: string }> = ({ message, className }) => {
    const text = summarize(message);
    if (!text) return null;

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs
                  bg-amber-50 border-amber-300 text-amber-800 ${className ?? ""}`}
            title="Conflicting item"
            aria-label={`Conflicting item: ${text}`}
        >
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            {text}
        </span>
    );
};

export default ConflictPill;

/**
 * Produce a subtle tint by mixing a foreground color into a base color.
 * Both colors should be hex (#rgb or #rrggbb). If parsing fails, falls back to base.
 *
 * @param fg   Resource color (e.g., "#73cfff").
 * @param amt  Mix amount of fg into base (0..1).
 * @param base Base color (e.g., theme header bg "#f3f3f3").
 * @returns Hex "#rrggbb" of the mixed color.
 */
export function tintHeaderBg(fg: string, amt = 0.18, base = "#f3f3f3"): string {
    const F = hexToRgb(normHex(fg));
    const B = hexToRgb(normHex(base));
    if (!F || !B) return normHex(base);

    const a = clamp01(amt);
    const r = Math.round(B.r + (F.r - B.r) * a);
    const g = Math.round(B.g + (F.g - B.g) * a);
    const b = Math.round(B.b + (F.b - B.b) * a);
    return rgbToHex(r, g, b);
}

function normHex(h: string): string {
    const s = h.trim().toLowerCase();
    if (/^#([0-9a-f]{3})$/.test(s)) {
        return "#" + s.slice(1).split("").map((c) => c + c).join("");
    }
    if (/^#([0-9a-f]{6})$/.test(s)) return s;
    return "#000000"; // fallback sentinel
}

function hexToRgb(h: string): { r: number; g: number; b: number } | null {
    const m = /^#([0-9a-f]{6})$/.exec(h);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function clamp01(x: number): number {
    return Math.max(0, Math.min(1, x));
}

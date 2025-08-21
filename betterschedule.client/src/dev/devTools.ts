/**
 * Summary: Development helpers (no runtime side-effects).
 * - resetDevDatabase: calls server devtools endpoint to reseed/reset demo data.
 */
export async function resetDevDatabase(): Promise<boolean> {
    try {
        const res = await fetch("/api/devtools/reset-db", { method: "POST" });
        return res.ok;
    } catch {
        return false;
    }
}

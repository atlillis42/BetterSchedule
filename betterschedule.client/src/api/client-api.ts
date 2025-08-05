export async function searchClients(query: string = ""): Promise<{ id: string, name: string }[]> {
    const url = query
        ? `/api/clients?search=${encodeURIComponent(query)}`
        : `/api/clients`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch clients");
    return await response.json();
}
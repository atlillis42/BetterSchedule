export type DevUser = {
    key: "admin" | "provider" | "client";
    label: string;
    identifier: string;
    password: string;
};

export const DEV_USERS: DevUser[] = [
    { key: "admin", label: "Admin (All Roles)", identifier: "admin@dev.local", password: "Devpass123!" },
    { key: "provider", label: "Provider", identifier: "provider@dev.local", password: "Devpass123!" },
    { key: "client", label: "Client", identifier: "client@dev.local", password: "Devpass123!" }
];

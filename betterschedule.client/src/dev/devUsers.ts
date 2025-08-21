/**
 * Summary: Dev-only user catalog matching DbInitializer.
 * Passwords:
 * - *@dev.local → Devpass123!
 * - named demo users → Password123!
 */
export type DevUser = {
    key: string;
    label: string;
    email?: string;
    username?: string;
    password: string;
    orgLabel?: string;
};

export const DEV_USERS: DevUser[] = [
    { key: "admin_allroles_org1", label: "Admin (All Roles)", email: "admin@dev.local", username: "admin@dev.local", password: "Devpass123!", orgLabel: "Org1 / Dev" },
    { key: "provider_dev_org1", label: "Provider", email: "provider@dev.local", username: "provider@dev.local", password: "Devpass123!", orgLabel: "Org1 / Dev" },
    { key: "client_dev_org1", label: "Client", email: "client@dev.local", username: "client@dev.local", password: "Devpass123!", orgLabel: "Org1 / Dev" },
    { key: "hybrid_dev_org1", label: "Hybrid (Provider+Client)", email: "hybrid@dev.local", username: "hybrid@dev.local", password: "Devpass123!", orgLabel: "Org1 / Dev" },

    { key: "alice_manager_org1", label: "Alice (Manager)", email: "alice@example.com", username: "alice", password: "Password123!", orgLabel: "Org1 / Demo" },
    { key: "bob_provider_org1", label: "Bob (Provider)", email: "bob@example.com", username: "bob", password: "Password123!", orgLabel: "Org1 / Demo" },
    { key: "carla_client_org1", label: "Carla (Client)", email: "carla@example.com", username: "carla", password: "Password123!", orgLabel: "Org1 / Demo" },

    { key: "dana_manager_org2", label: "Dana (Manager)", email: "dana@example.com", username: "dana", password: "Password123!", orgLabel: "Org2 / Demo" },
    { key: "eric_provider_org2", label: "Eric (Provider)", email: "eric@example.com", username: "eric", password: "Password123!", orgLabel: "Org2 / Demo" },
    { key: "frank_client_org2", label: "Frank (Client)", email: "frank@example.com", username: "frank", password: "Password123!", orgLabel: "Org2 / Demo" },
];

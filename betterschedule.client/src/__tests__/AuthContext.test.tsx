import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@auth/AuthContext";
import { vi, describe, beforeEach, test, expect } from "vitest";
import userEvent from "@testing-library/user-event";

// Mock the axios wrapper that AuthContext uses
vi.mock("@auth/axios", () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));
import { api } from "@auth/axios";
const mockedApi = vi.mocked(api, true);

// Helper component we interact with in tests
const TestComponent = () => {
    const { isAuthenticated, login, logout, user, loading } = useAuth();

    return (
        <div>
            <p data-testid="status">
                {loading
                    ? "Loading"
                    : isAuthenticated
                        ? `Logged in as ${user}`
                        : "Logged out"}
            </p>
            <button onClick={() => login("admin@dev.local", "password123")}>
                Login
            </button>
            <button onClick={logout}>Logout</button>
        </div>
    );
};

describe("AuthContext", () => {
    const user = userEvent.setup();

    beforeEach(() => {
        vi.resetAllMocks();
    });

    test("renders logged-out state by default", async () => {
        // First status check – unauthenticated
        mockedApi.get.mockResolvedValue({ data: { authenticated: false } });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // It should say “Logged out”
        expect(await screen.findByTestId("status")).toHaveTextContent("Logged out");
    });

    test("logs in and updates state", async () => {
        // First GET (on mount) → not authenticated
        mockedApi.get
            .mockResolvedValueOnce({ data: { authenticated: false } })
            // Second GET (refreshAuth after login) → authenticated
            .mockResolvedValue({ data: { authenticated: true, user: "admin@dev.local" } });

        // POST /dev/login (dev-mode) succeeds
        mockedApi.post.mockResolvedValueOnce({ status: 200 });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Click Login button
        await user.click(screen.getByText("Login"));

        // UI should update after refreshAuth
        expect(await screen.findByTestId("status")).toHaveTextContent(
            "Logged in as admin@dev.local"
        );
    });

    test("logs out and updates state", async () => {
        // First GET (on mount) → authenticated
        mockedApi.get
            .mockResolvedValueOnce({
                data: { authenticated: true, user: "admin@dev.local" },
            })
            // Second GET (refreshAuth inside logout) → not authenticated
            .mockResolvedValue({ data: { authenticated: false } });

        // POST /auth/logout succeeds
        mockedApi.post.mockResolvedValueOnce({ status: 200 });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Initial state should be logged in
        expect(await screen.findByTestId("status")).toHaveTextContent(
            "Logged in as admin@dev.local"
        );

        // Click Logout button
        await user.click(screen.getByText("Logout"));

        // Wait until refreshAuth has executed (second GET)
        await waitFor(() => expect(mockedApi.get).toHaveBeenCalledTimes(2));

        // UI should now show logged-out state
        expect(screen.getByTestId("status")).toHaveTextContent("Logged out");
    });
});
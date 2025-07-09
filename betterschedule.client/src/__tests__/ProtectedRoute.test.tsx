import { useAuth } from "@auth/AuthContext";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock the AuthContext hook so we can force various auth states
vi.mock("@auth/AuthContext", () => {
    return {
        useAuth: vi.fn(),
    };
});
const mockedUseAuth = vi.mocked(useAuth, true);

// Component under test
import ProtectedRoute from "@components/layout/ProtectedRoute";

// Simple helpers — tiny stand-in pages -----------------------------------
const PrivatePage = () => <h1 data-testid="private">Private Page</h1>;
const PublicPage = () => <h1 data-testid="public">Public Page</h1>;

describe("ProtectedRoute", () => {
    const user = userEvent.setup();

    beforeEach(() => {
        vi.resetAllMocks();
    });

    test("redirects unauthenticated users", async () => {
        // Fake “not logged in”
        mockedUseAuth.mockReturnValue({ isAuthenticated: false, loading: false });

        render(
            <MemoryRouter initialEntries={["/protected"]}>
                <Routes>
                    <Route
                        path="/protected"
                        element={
                            <ProtectedRoute>
                                <PrivatePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/" element={<PublicPage />} />
                </Routes>
            </MemoryRouter>
        );

        // We should land on the fallback “/” route
        expect(await screen.findByTestId("public")).toBeInTheDocument();
    });

    test("shows loading indicator while auth is checking", () => {
        mockedUseAuth.mockReturnValue({ isAuthenticated: false, loading: true });

        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <PrivatePage />
                </ProtectedRoute>
            </MemoryRouter>
        );

        // Your loader text from the real component
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test("renders children when authenticated", async () => {
        mockedUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });

        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <PrivatePage />
                </ProtectedRoute>
            </MemoryRouter>
        );

        // Authenticated users should see the protected content
        expect(await screen.findByTestId("private")).toBeInTheDocument();
    });
});

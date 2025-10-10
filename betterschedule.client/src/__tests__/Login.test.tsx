import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "../components/auth/Login";
import { AuthProvider } from "../components/auth/AuthProvider";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

// Mock the useAuth hook
vi.mock("../components/auth/auth-context", async () => {
    const original = await vi.importActual("../components/auth/auth-context");
    return {
        ...original,
        useAuth: () => ({
            login: async (email: string, password: string) => {
                if (email === "test@example.com" && password === "password") {
                    return { success: true, message: "Login successful" };
                }
                return { success: false, message: "Invalid credentials" };
            },
            isAuthenticated: false,
            loading: false,
        }),
        AuthProvider: original.AuthProvider,
    };
});

describe("Login Component", () => {
    const setup = () =>
        render(
            <MemoryRouter>
                <AuthProvider>
                    <Login />
                </AuthProvider>
            </MemoryRouter>
        );

    it("renders form inputs and buttons", () => {
        setup();
        expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
        expect(screen.getByText(/login/i)).toBeInTheDocument();
        expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
    });

    it("logs in successfully and shows success message", async () => {
        setup();
        fireEvent.change(screen.getByPlaceholderText("Email"), {
            target: { value: "test@example.com" },
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "password" },
        });
        fireEvent.click(screen.getByText("Login"));

        await waitFor(() =>
            expect(screen.getByText(/✅ login successful/i)).toBeInTheDocument()
        );
    });

    it("shows error on invalid login", async () => {
        setup();
        fireEvent.change(screen.getByPlaceholderText("Email"), {
            target: { value: "wrong@example.com" },
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "wrongpass" },
        });
        fireEvent.click(screen.getByText("Login"));

        await waitFor(() =>
            expect(screen.getByText(/❌ invalid credentials/i)).toBeInTheDocument()
        );
    });
});

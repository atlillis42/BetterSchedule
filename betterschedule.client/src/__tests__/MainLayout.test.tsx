import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, beforeEach, test, expect } from "vitest";
import MainLayout from "@components/layout/MainLayout";            // <-- adjust if path differs


// ---------- Mocks ------------------------
// Mock React-Router navigate
vi.mock("react-router-dom", async (orig) => {
    const actual = await orig();           // pull real exports
    return {
        ...actual,
        useNavigate: () => mockedNavigate,
    };
});
const mockedNavigate = vi.fn();

// Mock the auth hook for logout
vi.mock("@auth/AuthContext", () => ({
    useAuth: () => ({
        logout: mockedLogout,
    }),
}));
const mockedLogout = vi.fn();

// --------- Tests ----------------
describe("MainLayout", () => {
    const user = userEvent.setup();

    beforeEach(() => {
        mockedNavigate.mockReset();
        mockedLogout.mockReset();
    });

    test("clicking Logout calls auth.logout and navigates home", async () => {
        render(
            <MainLayout>
                <div>Dummy child</div>
            </MainLayout>
        );

        await user.click(screen.getByRole("button", { name: /logout/i }));

        expect(mockedLogout).toHaveBeenCalledTimes(1);
        expect(mockedNavigate).toHaveBeenCalledWith("/");     // home login page
    });

    test("clicking title navigates to /calendar", async () => {
        render(
            <MainLayout>
                <div>Dummy child</div>
            </MainLayout>
        );

        await user.click(screen.getByRole("heading", { name: /betterschedule/i }));

        expect(mockedNavigate).toHaveBeenCalledWith("/calendar");
    });
});

/**
 * @file Login page for BetterSchedule.
 * @summary Demo-focused login with pre-filled Demo User credentials + one-click sandbox start.
 */

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@auth/axios";
import { useAuth, type AuthStatusResponse } from "@auth/auth-context";

/** Response payload from POST /api/demo/start. */
type StartDemoResponse = {
    organizationId: string;
    ephemeralUserId: string;
};

const DEFAULT_DEMO_EMAIL = "demo.user@local.com";
const DEFAULT_DEMO_PASSWORD = "Password123!";

const Login: React.FC = () => {
    const [email, setEmail] = useState<string>(DEFAULT_DEMO_EMAIL);
    const [password, setPassword] = useState<string>(DEFAULT_DEMO_PASSWORD);
    const [status, setStatus] = useState<string>("");
    const [startingDemo, setStartingDemo] = useState<boolean>(false);
    const navigate = useNavigate();

    const { login, isAuthenticated, loading, refreshAuth } = useAuth();

    useEffect(() => {
        if (!loading && isAuthenticated) {
            navigate("/calendar");
        }
    }, [loading, isAuthenticated, navigate]);

    /**
     * Attempts a standard login (dev identity API or production /login).
     * On success navigates to /calendar.
     */
    const handleLogin = async () => {
        const result = await login(email, password);
        if (result.success) {
            setStatus(`✅ ${result.message}`);
            navigate("/calendar");
        } else {
            setStatus(`❌ ${result.message}`);
        }
    };

    /**
     * Starts a demo sandbox:
     * 1) POST /api/demo/start (sets auth cookie server-side)
     * 2) refreshAuth() to rehydrate context
     * 3) GET /api/auth/status for deterministic routing (avoids race on context propagation)
     * 4) Route to /calendar when organizationId is present; otherwise /join
     */
    const startDemo = async () => {
        if (startingDemo) return;

        setStartingDemo(true);
        setStatus("Starting demo…");

        try {
            // 1) Create sandbox + sign-in ephemeral user (cookie auth)
            await api.post<StartDemoResponse>("/demo/start", {});

            // 2) Update app-wide auth context
            await refreshAuth();

            // 3) Read fresh status payload deterministically for routing
            const { data: s } = await api.get<AuthStatusResponse>("/auth/status");

            if (s?.authenticated) {
                if (s.organizationId) {
                    setStatus("✅ Demo started. Redirecting…");
                    navigate("/calendar");
                } else {
                    setStatus("✅ Signed in. No organization yet — redirecting…");
                    navigate("/join");
                }
            } else {
                setStatus("❌ Demo started, but no session detected. Check cookies/CORS settings.");
            }
        } catch (err: any) {
            const statusCode = err?.response?.status;
            if (statusCode === 429) {
                const raHeader = err?.response?.headers?.["retry-after"];
                const raBody = err?.response?.data?.retryAfterSeconds;
                const retryAfter = raHeader ?? (typeof raBody === "number" ? `${raBody}` : null);
                setStatus(`❌ Rate limited. Try again in ${retryAfter ? `${retryAfter}s` : "a bit"}.`);
            } else {
                const msg =
                    err?.response?.data?.message ??
                    err?.response?.data?.error ??
                    "Demo start failed.";
                setStatus(`❌ ${msg}`);
            }
        } finally {
            setStartingDemo(false);
        }
    };

    const goRegister = () => navigate("/register");

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
                <div className="mb-6 text-center">
                    <h1 className="text-3xl font-extrabold text-blue-700">BetterSchedule</h1>
                    <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
                </div>

                {/* One-click demo start */}
                <button
                    onClick={startDemo}
                    disabled={startingDemo}
                    className="w-full py-3 mb-4 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60 transition shadow-sm"
                    title="Start a live demo (creates a temporary sandbox)"
                >
                    {startingDemo ? "Starting demo…" : "Start live demo"}
                </button>

                <div className="flex items-center my-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="px-3 text-xs text-gray-400">or</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Username/password login (useful in dev or for non-demo users) */}
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full p-3 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="username"
                    aria-label="Email"
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="current-password"
                    aria-label="Password"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void handleLogin();
                    }}
                />

                <div className="flex items-center justify-between gap-3 mb-3">
                    <button
                        onClick={goRegister}
                        className="bg-white text-blue-600 w-1/2 py-3 rounded-lg border border-blue-200 hover:bg-blue-50 transition font-medium"
                        title="Go to registration"
                    >
                        Registration
                    </button>
                    <button
                        onClick={handleLogin}
                        className="bg-blue-600 text-white w-1/2 py-3 rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
                        title="Login"
                    >
                        Login
                    </button>
                </div>

                <button
                    onClick={() => (window.location.href = "/api/auth/google")}
                    className="bg-gradient-to-r from-blue-100 to-blue-200 border border-blue-300 text-blue-800 w-full py-2 rounded-lg hover:from-blue-200 hover:to-blue-300 transition flex items-center justify-center gap-2 shadow-sm"
                    title="Sign in with Google"
                >
                    <img
                        src="https://www.svgrepo.com/show/475656/google-color.svg"
                        alt="Google"
                        className="w-5 h-5"
                    />
                    <span className="text-sm font-medium">Sign in with Google</span>
                </button>

                {status && (
                    <div className="mt-4 text-sm text-center text-gray-600" role="status" aria-live="polite">
                        {status}
                    </div>
                )}

                <div className="mt-4 text-center text-xs text-gray-500">
                    <span>Don’t have an account? </span>
                    <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;

/**
 * @file Base login component for BetterSchedule.
 * @summary Reusable login UI with variant switching for "full" vs "demo" flows.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@auth/axios";
import { useAuth, type AuthStatusResponse } from "@auth/auth-context";
import { formatRetryAfterFromError } from "@/utilities/retryAfter";

/** Response payload from POST /api/demo/start. */
type StartDemoResponse = {
    organizationId: string;
    ephemeralUserId: string;
};

/** Props for the base login component. */
export type LoginBaseProps = {
    /**
     * Controls which experience to render.
     * - "demo": Only the demo sandbox flow is enabled; standard login/register are disabled.
     * - "full": Standard login/register are enabled; demo UI is hidden.
     */
    variant: "demo" | "full";
};

/** Default demo credentials (prefill for demo variant). */
const DEFAULT_DEMO_EMAIL = "demo.user@local.com";
const DEFAULT_DEMO_PASSWORD = "Password123!";

/**
 * Base login component with both standard and demo sandbox flows.
 * Consumers should prefer small wrappers (Login, DemoLogin) to select a variant.
 */
const LoginBase: React.FC<LoginBaseProps> = ({ variant }) => {
    const navigate = useNavigate();
    const isDemoMode = useMemo(() => variant === "demo", [variant]);

    const [email, setEmail] = useState<string>(isDemoMode ? DEFAULT_DEMO_EMAIL : "");
    const [password, setPassword] = useState<string>(isDemoMode ? DEFAULT_DEMO_PASSWORD : "");
    const [status, setStatus] = useState<string>("");
    const [startingDemo, setStartingDemo] = useState<boolean>(false);
    const [infoOpen, setInfoOpen] = useState<boolean>(false);

    const { login, isAuthenticated, loading, refreshAuth } = useAuth();

    useEffect(() => {
        if (!loading && isAuthenticated) {
            navigate("/calendar");
        }
    }, [loading, isAuthenticated, navigate]);

    /**
     * Attempts a standard login (dev identity API or production /login).
     * Suppressed when in demo mode.
     */
    const handleLogin = async () => {
        if (isDemoMode) {
            setStatus("🔒 Standard login is disabled in this demo. Use Start Demo Sandbox.");
            return;
        }
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
     * 3) GET /api/auth/status for deterministic routing
     * 4) Route to /calendar when organizationId exists; otherwise /join
     */
    const startDemo = async () => {
        if (startingDemo) return;

        setStartingDemo(true);
        setStatus("Starting demo…");

        try {
            await api.post<StartDemoResponse>("/demo/start", {}, { withCredentials: true });
            await refreshAuth();

            const { data: s } = await api.get<AuthStatusResponse>("/auth/status", { withCredentials: true });

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
        } catch (error: unknown) {
            // Prefer explicit, readable names
            // and a small helper for formatting.
            const statusCode = (error as any)?.response?.status;
            if (statusCode === 429) {
                // NEW: user-friendly minutes/seconds
                const friendly = formatRetryAfterFromError(error);
                setStatus(`❌ Rate limited. Try again in ${friendly}.`);
            } else {
                const message =
                    (error as any)?.response?.data?.message ??
                    (error as any)?.response?.data?.error ??
                    "Demo start failed.";
                setStatus(`❌ ${message}`);
            }
        } finally {
            setStartingDemo(false);
        }
    };

    const goRegister = () => {
        if (isDemoMode) {
            setStatus("🔒 Registration is disabled in this demo. Use Start Demo Sandbox.");
            return;
        }
        navigate("/register");
    };

    const disabledTip = "Disabled in demo — use “Start Demo Sandbox.”";

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-200">               

                <div className="mb-6 text-center">
                    <h1 className="text-3xl font-extrabold text-blue-700">BetterSchedule</h1>
                    <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
                </div>

                {/* Demo-only sandbox section */}
                {isDemoMode && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-5">
                        {infoOpen && (
                            <div
                                id="sandbox-info"
                                className="mb-3 rounded-lg border border-blue-200 bg-white p-3 text-xs text-blue-900"
                            >
                                <ul className="list-disc pl-5">
                                    <li>Your data stays separate from other demo visitors.</li>
                                    <li>Safe to explore—no risk of affecting shared content.</li>
                                    <li>Auto-expires later, leaving no clutter behind.</li>
                                </ul>
                            </div>
                        )}

                        <button
                            onClick={startDemo}
                            disabled={startingDemo}
                            className={`w-full py-3 rounded-lg font-medium transition shadow-sm ${startingDemo
                                    ? "cursor-not-allowed bg-blue-200 text-blue-900/60"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                                }`}
                            title="Start a live demo (creates a temporary sandbox)"
                            aria-busy={startingDemo}
                        >
                            {startingDemo ? "Starting Sandbox…" : "Start Demo Sandbox"}
                        </button>

                        <p className="mt-2 text-center text-[11px] text-blue-900/70">
                            Your sandbox is separate from others and will automatically expire later.
                        </p>

                        <button
                            type="button"
                            className="mt-2 text-center text-xs text-blue-700 underline underline-offset-4 "
                            onClick={() => setInfoOpen((v) => !v)}
                            aria-expanded={infoOpen}
                            aria-controls="sandbox-info"
                        >
                            Why Sandbox?
                        </button>
                    </div>
                )}

                {/* Divider */}
                <div className="flex items-center my-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="px-3 text-xs text-gray-400">or</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Email/password (visible; disabled in demo) */}
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className={`w-full p-3 mb-3 rounded-lg focus:outline-none focus:ring-2 ${isDemoMode
                            ? "cursor-not-allowed bg-gray-50 text-gray-500 border border-gray-200"
                            : "border border-gray-300 focus:ring-blue-500"
                        }`}
                    autoComplete="username"
                    aria-label="Email"
                    disabled={isDemoMode}
                    title={isDemoMode ? disabledTip : undefined}
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className={`w-full p-3 mb-4 rounded-lg focus:outline-none focus:ring-2 ${isDemoMode
                            ? "cursor-not-allowed bg-gray-50 text-gray-500 border border-gray-200"
                            : "border border-gray-300 focus:ring-blue-500"
                        }`}
                    autoComplete="current-password"
                    aria-label="Password"
                    disabled={isDemoMode}
                    title={isDemoMode ? disabledTip : undefined}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !isDemoMode) void handleLogin();
                    }}
                />

                <div className="flex items-center justify-between gap-3 mb-3">
                    <button
                        onClick={goRegister}
                        className={`w-1/2 py-3 rounded-lg border transition font-medium ${isDemoMode
                                ? "cursor-not-allowed bg-white text-gray-400 border-gray-200"
                                : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                            }`}
                        title={isDemoMode ? disabledTip : "Go to registration"}
                        disabled={isDemoMode}
                    >
                        Registration
                    </button>
                    <button
                        onClick={handleLogin}
                        className={`w-1/2 py-3 rounded-lg transition font-medium shadow-sm ${isDemoMode
                                ? "cursor-not-allowed bg-gray-200 text-gray-500"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                        title={isDemoMode ? disabledTip : "Login"}
                        disabled={isDemoMode}
                    >
                        Login
                    </button>
                </div>

                <button
                    onClick={() => {
                        if (isDemoMode) {
                            setStatus("🔒 Google sign-in is disabled in this demo. Use Start Demo Sandbox.");
                        } else {
                            window.location.href = "/api/auth/google";
                        }
                    }}
                    className={`w-full py-2 rounded-lg transition flex items-center justify-center gap-2 shadow-sm ${isDemoMode
                            ? "cursor-not-allowed bg-gray-50 text-gray-500 border border-gray-200"
                            : "bg-gradient-to-r from-blue-100 to-blue-200 border border-blue-300 text-blue-800 hover:from-blue-200 hover:to-blue-300"
                        }`}
                    title={isDemoMode ? disabledTip : "Sign in with Google"}
                    disabled={isDemoMode}
                >
                    <img
                        src="https://www.svgrepo.com/show/475656/google-color.svg"
                        alt="Google"
                        className="w-5 h-5"
                        aria-hidden
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
                    <Link
                        to={isDemoMode ? "#" : "/register"}
                        onClick={(e) => {
                            if (isDemoMode) {
                                e.preventDefault();
                                setStatus("🔒 Registration is disabled in this demo. Use Start Demo Sandbox.");
                            }
                        }}
                        className={isDemoMode ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:underline"}
                    >
                        Register
                    </Link>
                </div>

                {/* Demo banner */}
                {isDemoMode && (
                    <div className="mt-4 text-center text-xs text-blue-900">
                        <p className="text-sm text-center">
                            Standard sign-in and registration are shown for reference, but intentionally disabled in demo mode
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default LoginBase;
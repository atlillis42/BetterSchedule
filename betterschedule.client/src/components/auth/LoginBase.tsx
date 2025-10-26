/**
 * @file Base login component for BetterSchedule.
 * @summary Reusable login UI with variant switching for "full" vs "demo" flows.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@auth/axios";
import { useAuth, type AuthStatusResponse } from "@auth/auth-context";
import { formatRetryAfterFromError } from "@/utilities/retryAfter";

type StartDemoResponse = { organizationId: string; ephemeralUserId: string; };
export type LoginBaseProps = { variant: "demo" | "full"; };

const DEFAULT_DEMO_EMAIL = "demo.user@local.com";
const DEFAULT_DEMO_PASSWORD = "Password123!";

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
        if (!loading && isAuthenticated) navigate("/calendar");
    }, [loading, isAuthenticated, navigate]);

    const handleLogin = async () => {
        if (isDemoMode) { setStatus("🔒 Standard login is disabled in this demo. Use Start Demo Sandbox."); return; }
        const result = await login(email, password);
        if (result.success) { setStatus(`✅ ${result.message}`); navigate("/calendar"); }
        else { setStatus(`❌ ${result.message}`); }
    };

    const startDemo = async () => {
        if (startingDemo) return;
        setStartingDemo(true);
        setStatus("Starting demo…");
        try {
            await api.post<StartDemoResponse>("/demo/start", {}, { withCredentials: true });
            await refreshAuth();
            const { data: s } = await api.get<AuthStatusResponse>("/auth/status", { withCredentials: true });
            if (s?.authenticated) {
                if (s.organizationId) { setStatus("✅ Demo started. Redirecting…"); navigate("/calendar"); }
                else { setStatus("✅ Signed in. No organization yet — redirecting…"); navigate("/join"); }
            } else {
                setStatus("❌ Demo started, but no session detected. Check cookies/CORS settings.");
            }
        } catch (error: unknown) {
            const statusCode = (error as any)?.response?.status;
            if (statusCode === 429) {
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
        if (isDemoMode) { setStatus("🔒 Registration is disabled in this demo. Use Start Demo Sandbox."); return; }
        navigate("/register");
    };

    const disabledTip = "Disabled in demo — use “Start Demo Sandbox.”";

    return (
        <div
            className="
        min-h-screen flex items-center justify-center
        bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100
        dark:from-slate-950 dark:via-slate-950 dark:to-slate-900
      "
        >
            <div
                className="
          w-full max-w-md rounded-2xl border p-8 shadow-xl backdrop-blur
          bg-white/95 border-blue-100 shadow-blue-200/40
          dark:bg-slate-800/90 dark:border-slate-700 dark:shadow-black/20
        "
            >
                <div className="mb-6 text-center">
                    <h1 className="text-3xl font-extrabold text-blue-700 dark:text-slate-100">BetterSchedule</h1>
                    <p className="text-sm text-blue-900/70 dark:text-slate-400 mt-1">Sign in to your account</p>
                </div>

                {/* Demo-only sandbox section */}
                {isDemoMode && (
                    <div className="rounded-xl border p-4 mb-5 bg-blue-50/70 border-blue-200 dark:bg-slate-900 dark:border-slate-700">
                        {infoOpen && (
                            <div
                                id="sandbox-info"
                                className="
                  mb-3 rounded-lg border p-3 text-xs
                  bg-white border-blue-200 text-blue-900
                  dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200
                "
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
                            className={`
                w-full py-3 rounded-lg font-medium transition shadow-sm
                ${startingDemo
                                    ? "cursor-not-allowed bg-emerald-700/30 text-emerald-200/70"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"}
              `}
                            title="Start a live demo (creates a temporary sandbox)"
                            aria-busy={startingDemo}
                        >
                            {startingDemo ? "Starting Sandbox…" : "Start Demo Sandbox"}
                        </button>

                        <p className="mt-2 text-center text-[11px] text-blue-900/70 dark:text-slate-400">
                            Your sandbox is separate from others and will automatically expire later.
                        </p>

                        <button
                            type="button"
                            className="mt-2 text-center text-xs text-blue-700 hover:text-blue-800 underline underline-offset-4 dark:text-slate-300 dark:hover:text-slate-200"
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
                    <div className="flex-1 h-px bg-blue-200 dark:bg-slate-700" />
                    <span className="px-3 text-xs text-blue-400 dark:text-slate-500">or</span>
                    <div className="flex-1 h-px bg-blue-200 dark:bg-slate-700" />
                </div>

                {/* Email */}
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className={`
            w-full p-3 mb-3 rounded-lg border focus:outline-none focus:ring-2
            ${isDemoMode
                            ? "cursor-not-allowed bg-blue-50 text-blue-900/60 border-blue-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800"
                            : "border-blue-300 focus:ring-blue-500 bg-white text-slate-900 placeholder-blue-400/70 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400"}
          `}
                    autoComplete="username"
                    aria-label="Email"
                    disabled={isDemoMode}
                    title={isDemoMode ? disabledTip : undefined}
                />

                {/* Password */}
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className={`
            w-full p-3 mb-4 rounded-lg border focus:outline-none focus:ring-2
            ${isDemoMode
                            ? "cursor-not-allowed bg-blue-50 text-blue-900/60 border-blue-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800"
                            : "border-blue-300 focus:ring-blue-500 bg-white text-slate-900 placeholder-blue-400/70 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400"}
          `}
                    autoComplete="current-password"
                    aria-label="Password"
                    disabled={isDemoMode}
                    title={isDemoMode ? disabledTip : undefined}
                    onKeyDown={(e) => { if (e.key === "Enter" && !isDemoMode) void handleLogin(); }}
                />

                <div className="flex items-center justify-between gap-3 mb-3">
                    {/* Registration */}
                    <button
                        onClick={goRegister}
                        className={`
              w-1/2 py-3 rounded-lg border transition font-medium
              ${isDemoMode
                                ? "cursor-not-allowed bg-blue-50 text-blue-900/60 border-blue-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800"
                                : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"}
            `}
                        title={isDemoMode ? disabledTip : "Go to registration"}
                        disabled={isDemoMode}
                    >
                        Registration
                    </button>

                    {/* Login */}
                    <button
                        onClick={handleLogin}
                        className={`
              w-1/2 py-3 rounded-lg transition font-medium shadow-sm
              ${isDemoMode
                                ? "cursor-not-allowed bg-blue-200 text-blue-900/60 dark:bg-slate-800 dark:text-slate-500"
                                : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"}
            `}
                        title={isDemoMode ? disabledTip : "Login"}
                        disabled={isDemoMode}
                    >
                        Login
                    </button>
                </div>

                {/* Google Sign-in */}
                <button
                    onClick={() => {
                        if (isDemoMode) setStatus("🔒 Google sign-in is disabled in this demo. Use Start Demo Sandbox.");
                        else window.location.href = "/api/auth/google";
                    }}
                    className={`
            w-full py-2 rounded-lg transition flex items-center justify-center gap-2 shadow-sm border
            ${isDemoMode
                            ? "cursor-not-allowed bg-blue-50 text-blue-900/60 border-blue-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800"
                            : "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 border-blue-200 hover:from-blue-100 hover:to-blue-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"}
          `}
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
                    <div className="mt-4 text-sm text-center text-blue-900/80 dark:text-slate-300" role="status" aria-live="polite">
                        {status}
                    </div>
                )}

                <div className="mt-4 text-center text-xs text-blue-900/70 dark:text-slate-400">
                    <span>Don’t have an account? </span>
                    <Link
                        to={isDemoMode ? "#" : "/register"}
                        onClick={(e) => {
                            if (isDemoMode) { e.preventDefault(); setStatus("🔒 Registration is disabled in this demo. Use Start Demo Sandbox."); }
                        }}
                        className={isDemoMode
                            ? "text-blue-900/50 cursor-not-allowed"
                            : "text-blue-600 hover:underline dark:text-blue-400"}
                    >
                        Register
                    </Link>
                </div>

                {/* Demo banner */}
                {isDemoMode && (
                    <div className="mt-4 text-center text-xs text-blue-900/80 dark:text-slate-300">
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

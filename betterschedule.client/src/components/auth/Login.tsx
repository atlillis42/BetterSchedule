/**
 * Summary: Login page.
 * - Always shows Registration and Login buttons.
 * - PROD: standard email/password login.
 * - DEV: adds a small "Dev shortcuts" panel with quick sign-ins (Manager/Provider/Client).
 * - Redirects to /calendar after successful auth.
 */
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@auth/AuthContext";

const DEV_ACCOUNTS = {
    manager: { email: "admin@dev.local", password: "Devpass123!" },
    provider: { email: "provider@dev.local", password: "Devpass123!" },
    client: { email: "client@dev.local", password: "Devpass123!" },
} as const;

const Login: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("");
    const navigate = useNavigate();

    const { login, isAuthenticated, loading } = useAuth();

    useEffect(() => {
        if (!loading && isAuthenticated) {
            navigate("/calendar");
        }
    }, [loading, isAuthenticated, navigate]);

    const handleLogin = async () => {
        const result = await login(email, password);
        if (result.success) {
            setStatus(`✅ ${result.message}`);
            navigate("/calendar");
        } else {
            setStatus(`❌ ${result.message}`);
        }
    };

    const goRegister = () => navigate("/register");

    // DEV helpers
    const devQuick = async (which: keyof typeof DEV_ACCOUNTS) => {
        const { email, password } = DEV_ACCOUNTS[which];
        const res = await login(email, password);
        if (res.success) navigate("/calendar");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
                <div className="mb-6 text-center">
                    <h1 className="text-3xl font-extrabold text-blue-700">BetterSchedule</h1>
                    <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
                </div>

                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full p-3 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="username"
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="current-password"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleLogin();
                    }}
                />

                <div className="flex items-center justify-between gap-3 mb-3">
                    <button
                        onClick={goRegister}
                        className="bg-white text-blue-600 w-1/2 py-3 rounded-lg border border-blue-200 hover:bg-blue-50 transition font-medium"
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
                >
                    <img
                        src="https://www.svgrepo.com/show/475656/google-color.svg"
                        alt="Google"
                        className="w-5 h-5"
                    />
                    <span className="text-sm font-medium">Sign in with Google</span>
                </button>

                {/* DEV-only shortcuts (subtle, secondary to main CTAs) */}
                {import.meta.env.DEV && (
                    <div className="mt-4 border-t pt-3">
                        <div className="text-xs text-gray-500 mb-2">Dev shortcuts</div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => devQuick("manager")} className="px-2 py-1 bg-white border rounded hover:bg-gray-50 text-sm">
                                Manager
                            </button>
                            <button onClick={() => devQuick("provider")} className="px-2 py-1 bg-white border rounded hover:bg-gray-50 text-sm">
                                Provider
                            </button>
                            <button onClick={() => devQuick("client")} className="px-2 py-1 bg-white border rounded hover:bg-gray-50 text-sm">
                                Client
                            </button>
                        </div>
                    </div>
                )}

                {status && (
                    <div className="mt-4 text-sm text-center text-gray-600">
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

/**
 * @file Login page for BetterSchedule.
 * @summary Demo-focused login with pre-filled Austin Lillis credentials.
 */

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@auth/auth-context";

/** Default demo email used to quickly sign in as Austin (Manager + ServiceProvider in org1). */
const DEFAULT_DEMO_EMAIL = "austin.manager@fdb.local";
/** Default demo password aligned with seed data for the Austin account. */
const DEFAULT_DEMO_PASSWORD = "Password123!";

/**
 * Login component for BetterSchedule.
 *
 * @remarks
 * - Credentials pre-filled for the demo "Austin Lillis" user.
 * - Redirects to /calendar upon successful authentication.
 * - Includes a Google SSO button that navigates to the backend SSO endpoint.
 *
 * @returns Login page JSX element.
 */
const Login: React.FC = () => {
    const [email, setEmail] = useState<string>(DEFAULT_DEMO_EMAIL);
    const [password, setPassword] = useState<string>(DEFAULT_DEMO_PASSWORD);
    const [status, setStatus] = useState<string>("");
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
                        if (e.key === "Enter") handleLogin();
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

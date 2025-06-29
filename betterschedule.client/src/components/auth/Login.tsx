import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const Login: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("");
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async () => {
        const result = await login(email, password);
        if (result.success) {
            setStatus(`✅ ${result.message}`);
            navigate("/calendar");
        } else {
            setStatus(`❌ ${result.message}`);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = "/api/auth/google";
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
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full p-3 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-right text-sm text-blue-600 hover:underline cursor-pointer mb-4">
                    Forgot Password?
                </div>

                <button
                    onClick={handleLogin}
                    className="bg-blue-600 text-white w-full py-3 rounded-lg hover:bg-blue-700 transition font-medium text-lg mb-3 shadow-sm"
                >
                    {import.meta.env.MODE === "development" ? "Dev Login" : "Login"}
                </button>

                <button
                    onClick={handleGoogleLogin}
                    className="bg-gradient-to-r from-blue-100 to-blue-200 border border-blue-300 text-blue-800 w-full py-2 rounded-lg hover:from-blue-200 hover:to-blue-300 transition flex items-center justify-center gap-2 shadow-sm"
                >
                    <img
                        src="https://www.svgrepo.com/show/475656/google-color.svg"
                        alt="Google"
                        className="w-5 h-5"
                    />
                    <span className="text-sm font-medium">Sign in with Google</span>
                </button>

                {status && (
                    <p className="mt-4 text-sm text-center text-gray-600 whitespace-pre-wrap">{status}</p>
                )}
            </div>
        </div>
    );
};

export default Login;

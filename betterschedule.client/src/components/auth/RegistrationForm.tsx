import React, { useMemo, useState } from "react";
import { api } from "@auth/axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@auth/auth-context";
import { toast } from "react-toastify";

/* ----------------- helpers ----------------- */
const collapseWs = (s: string) => s.replace(/\s+/g, " ").trim();

/** Title-case tokens, preserving hyphens/apostrophes */
const toTitleCaseName = (raw: string) => {
    const s = collapseWs(raw.toLowerCase());
    if (!s) return "";
    return s
        .split(" ")
        .map(token =>
            token
                .split(/([\-’'`])/g)
                .map(part => (/^[a-z]/.test(part) ? part[0].toUpperCase() + part.slice(1) : part))
                .join("")
        )
        .join(" ");
};

const normalizeEmail = (e: string) => collapseWs(e).toLowerCase();
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isStrongEnoughPassword = (p: string) => p.length >= 8;

/* ----------------- component ----------------- */
const RegistrationForm: React.FC = () => {
    const [first, setFirst] = useState("");
    const [last, setLast] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [busy, setBusy] = useState(false);

    const navigate = useNavigate();
    const { refreshAuth } = useAuth();

    const normalized = useMemo(() => {
        const firstN = toTitleCaseName(first);
        const lastN = toTitleCaseName(last);
        const fullName = collapseWs(`${firstN} ${lastN}`);
        const emailN = normalizeEmail(email);
        return { firstN, lastN, fullName, emailN };
    }, [first, last, email]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!normalized.firstN) return toast.error("First name is required.");
        if (!normalized.lastN) return toast.error("Last name is required.");
        if (!isValidEmail(normalized.emailN)) return toast.error("Please enter a valid email.");
        if (!isStrongEnoughPassword(password)) return toast.error("Password must be at least 8 characters.");
        if (password !== confirm) return toast.error("Passwords do not match.");

        setBusy(true);
        try {
            await api.post("/auth/register", {
                email: normalized.emailN,
                password,
                fullName: normalized.fullName, // backend expects FullName
            });
            await refreshAuth();
            toast.success("Registered.");
            navigate("/join");
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Registration failed.";
            toast.error(msg);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
            <form onSubmit={submit} className="w-full max-w-md bg-white p-6 rounded-xl shadow border mx-auto">
                <h1 className="text-xl font-semibold mb-4 text-center">Create your account</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                    <label className="block text-sm">
                        <span className="block mb-1">First name</span>
                        <input
                            className="w-full border rounded px-3 py-2"
                            value={first}
                            onChange={e => setFirst(e.target.value)}
                            autoComplete="given-name"
                            inputMode="text"
                        />
                    </label>

                    <label className="block text-sm">
                        <span className="block mb-1">Last name</span>
                        <input
                            className="w-full border rounded px-3 py-2"
                            value={last}
                            onChange={e => setLast(e.target.value)}
                            autoComplete="family-name"
                            inputMode="text"
                        />
                    </label>
                </div>

                <label className="block text-sm mb-2">
                    <span className="block mb-1">Email</span>
                    <input
                        type="email"
                        className="w-full border rounded px-3 py-2"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        autoComplete="email"
                    />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="block text-sm">
                        <span className="block mb-1">Password</span>
                        <div className="flex items-stretch border rounded overflow-hidden">
                            <input
                                type={showPass ? "text" : "password"}
                                className="w-full px-3 py-2 outline-none"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(v => !v)}
                                className="px-3 text-sm bg-gray-50 border-l hover:bg-gray-100"
                                aria-label={showPass ? "Hide password" : "Show password"}
                            >
                                {showPass ? "Hide" : "Show"}
                            </button>
                        </div>
                        <span className="text-xs text-gray-500">At least 8 characters.</span>
                    </label>

                    <label className="block text-sm">
                        <span className="block mb-1">Confirm password</span>
                        <div className="flex items-stretch border rounded overflow-hidden">
                            <input
                                type={showConfirm ? "text" : "password"}
                                className="w-full px-3 py-2 outline-none"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(v => !v)}
                                className="px-3 text-sm bg-gray-50 border-l hover:bg-gray-100"
                                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                            >
                                {showConfirm ? "Hide" : "Show"}
                            </button>
                        </div>
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={busy}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 w-full"
                >
                    {busy ? "Creating…" : "Register"}
                </button>
            </form>
        </div>
    );
};

export default RegistrationForm;

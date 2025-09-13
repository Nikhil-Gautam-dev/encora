import { useState } from "react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    return (
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
                <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
                    Login
                </h2>
                <form className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-lg border p-2 outline-none focus:ring focus:ring-green-500"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border p-2 outline-none focus:ring focus:ring-green-500"
                    />
                    <button
                        type="submit"
                        className="w-full rounded-lg bg-green-600 p-2 text-white hover:bg-green-700"
                    >
                        Login
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-500">
                    Don’t have an account? <a href="/signup" className="text-green-600">Sign Up</a>
                </p>
            </div>
        </div>
    );
}

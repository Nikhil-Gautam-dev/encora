export default function Signup() {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
                <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
                    Sign Up
                </h2>
                <form className="space-y-4">
                    <input
                        type="text"
                        placeholder="Name"
                        className="w-full rounded-lg border p-2 outline-none focus:ring focus:ring-green-500"
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full rounded-lg border p-2 outline-none focus:ring focus:ring-green-500"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full rounded-lg border p-2 outline-none focus:ring focus:ring-green-500"
                    />
                    <button
                        type="submit"
                        className="w-full rounded-lg bg-green-600 p-2 text-white hover:bg-green-700"
                    >
                        Create Account
                    </button>
                </form>
            </div>
        </div>
    );
}

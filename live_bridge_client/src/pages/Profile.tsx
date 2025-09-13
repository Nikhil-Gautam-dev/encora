export default function Profile() {
    return (
        <div className="p-6">
            <div className="mb-6 flex flex-col items-center">
                <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl">
                    U
                </div>
                <h2 className="mt-3 text-xl font-semibold">User Name</h2>
                <p className="text-gray-500">user@example.com</p>
            </div>
        </div>
    );
}

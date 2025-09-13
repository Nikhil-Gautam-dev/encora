export default function Settings() {
    return (
        <div className="p-4">
            <h3 className="mb-4 text-lg font-semibold">Settings</h3>
            <ul className="space-y-3">
                <li className="rounded-lg bg-white p-3 shadow hover:bg-gray-50">
                    Account
                </li>
                <li className="rounded-lg bg-white p-3 shadow hover:bg-gray-50">
                    Privacy
                </li>
                <li className="rounded-lg bg-white p-3 shadow hover:bg-gray-50">
                    Notifications
                </li>
            </ul>
        </div>
    );
}

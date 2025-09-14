import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Tabs from "./components/Tabs";
import Chats from "./pages/Chats";
import ChatScreen from "./pages/ChatScreen";
import Status from "./pages/Status";
import Calls from "./pages/Calls";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import { WebSocketProvider } from "./context/WebSocketContext";
import { useState } from "react";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // TODO: replace with real auth logic

  const [userId, setUserId] = useState<string>("nik_123");
  const [inputId, setInputId] = useState("");

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-2xl shadow-md w-80">
          <h1 className="text-xl font-semibold mb-4 text-center">Login</h1>
          <input
            type="text"
            placeholder="Enter User ID"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              if (inputId.trim()) {
                setIsAuthenticated(true);
                setUserId(inputId.trim())
              };
            }}
            className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {!isAuthenticated ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : (
        <WebSocketProvider userId={userId}>
          <Routes>
            {/* Main App Tabs */}
            <Route path="/" element={<Tabs />}>
              <Route path="chats" element={<Chats />} />
              <Route path="status" element={<Status />} />
              <Route path="calls" element={<Calls />} />
            </Route>

            {/* Extra Screens */}
            <Route path="/chat/:userId" element={<ChatScreen />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/chats" />} />
          </Routes>
        </WebSocketProvider>
      )}
    </Router>
  );
}

export default App;

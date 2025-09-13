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

function App() {
  const isAuthenticated = true; // TODO: replace with real auth logic

  return (
    <Router>
      {!isAuthenticated ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : (
        <WebSocketProvider userId="nik_123">
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

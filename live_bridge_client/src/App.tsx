import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import Login from "./pages/Login";
import Tabs from "./components/Tabs";
import Chats from "./pages/Chats";
import ChatScreen from "./pages/ChatScreen";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Notifications from "./pages/Notifications";

function AppRoutes() {
    const { isAuthenticated, user, token } = useAuth();

    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        );
    }

    return (
        <WebSocketProvider userId={user!.id} token={token!}>
            <Routes>
                <Route path="/" element={<Tabs />}>
                    <Route index element={<Navigate to="/chats" />} />
                    <Route path="chats" element={<Chats />} />
                </Route>
                <Route path="/chat/:contactId" element={<ChatScreen />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/u/:username" element={<PublicProfile />} />
                <Route path="*" element={<Navigate to="/chats" />} />
            </Routes>
        </WebSocketProvider>
    );
}

function App() {
    return (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
            <AuthProvider>
                <Router>
                    <AppRoutes />
                    <ToastContainer
                        position="top-right"
                        autoClose={3000}
                        hideProgressBar={false}
                        newestOnTop
                        closeOnClick
                        pauseOnHover
                        draggable
                    />
                </Router>
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}

export default App;

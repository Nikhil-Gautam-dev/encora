import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Login from "./pages/Login";
import Tabs from "./components/Tabs";
import Chats from "./pages/Chats";
import ChatScreen from "./pages/ChatScreen";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Notifications from "./pages/Notifications";

function AppRoutes() {
    const { isAuthenticated, isLoading, user, token } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-950">
                <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

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
            <ThemeProvider>
                <AuthProvider>
                    <Router>
                        <AppRoutes />
                        <ThemedToast />
                    </Router>
                </AuthProvider>
            </ThemeProvider>
        </GoogleOAuthProvider>
    );
}

function ThemedToast() {
    const { darkMode } = useTheme();
    return (
        <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            theme={darkMode ? "dark" : "light"}
        />
    );
}

export default App;

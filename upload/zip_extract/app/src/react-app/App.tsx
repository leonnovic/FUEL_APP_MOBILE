import { HashRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from '@/react-app/context/AuthContext';
import { StationProvider } from '@/react-app/context/StationContext';
import { ThemeProvider } from '@/react-app/context/ThemeContext';
import HomePage from "@/react-app/pages/Home";
import AuthLogin from "@/react-app/components/AuthLogin";
import PasswordReset from "@/react-app/pages/PasswordReset";
import SubscriptionChecker from "@/react-app/components/SubscriptionChecker";
import FounderAccess from "@/react-app/pages/FounderAccess";
import { FuelProvider } from "@/react-app/context/FuelContext";
import { PermissionProvider } from "@/react-app/context/PermissionContext";
import { LocalizationProvider } from "@/react-app/context/LocalizationContext";
import AIAssistant from "@/react-app/components/AIAssistant";
import InviteAccept from "@/react-app/pages/InviteAccept";

function AppContent() {
  const { user, isPending } = useAuth();

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20 text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white font-serif">FuelPro</h2>
          <p className="text-gray-300 mt-2 text-sm">Initializing systems...</p>
          <div className="mt-4 flex items-center gap-2 justify-center">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Loading your stations</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Invite acceptance - works whether logged in or not */}
        <Route path="/join/:inviteId" element={<InviteAccept />} />

        {/* Main app - requires login */}
        <Route
          path="/"
          element={user ? (
            <SubscriptionChecker>
              <StationProvider>
                <FuelProvider>
                  <HomePage />
                </FuelProvider>
              </StationProvider>
            </SubscriptionChecker>
          ) : (
            <AuthLogin />
          )}
        />

        {/* Password Reset */}
        <Route path="/reset-password" element={<PasswordReset />} />

        {/* Founder Access - password-protected global admin console */}
        <Route path="/founder" element={<FounderAccess />} />

        {/* Redirect old admin route to founder */}
        <Route path="/admin" element={<Navigate to="/founder" replace />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AIAssistant />
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LocalizationProvider>
          <PermissionProvider>
            <AppContent />
          </PermissionProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

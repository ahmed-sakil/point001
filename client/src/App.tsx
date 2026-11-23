import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import CommandCenter from "./pages/CommandCenter";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import { useAuth } from "./context/AuthContext";
import TasksPage from "./pages/TasksPage";
import CalendarPage from "./pages/CalendarPage";
import HabitsPage from "./pages/HabitsPage";
import FinancePage from "./pages/FinancePage";
import ContactsPage from "./pages/ContactsPage";
import SettingsPage from "./pages/SettingsPage";
import InboxPage from "./pages/InboxPage";

// Route wrapper preventing authenticated users from seeing login/register
const PublicAuthOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isLoading } = useAuth();
  if (!isLoading && token && user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export function App() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={
          <PublicAuthOnly>
            <LoginPage />
          </PublicAuthOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicAuthOnly>
            <RegisterPage />
          </PublicAuthOnly>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicAuthOnly>
            <ForgotPasswordPage />
          </PublicAuthOnly>
        }
      />

      {/* Protected Routes (Requiring Token & Auth Session) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<CommandCenter />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/:subpage" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Wildcard Fallback: If not logged in -> ProtectedRoute will bounce to /login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

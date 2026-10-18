import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TeamPage } from "./pages/TeamPage";
import { CustomersPage } from "./pages/CustomersPage";
import { CustomerFormPage } from "./pages/CustomerFormPage";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { GardenPage } from "./pages/GardenPage";
import { GardenFormPage } from "./pages/GardenFormPage";
import { RequestsPage } from "./pages/RequestsPage";
import { NewRequestPage } from "./pages/NewRequestPage";
import { RequestDetailPage } from "./pages/RequestDetailPage";

const STAFF_PAGES = [
  ["/customers", CustomersPage],
  ["/customers/new", CustomerFormPage],
  ["/customers/:id", CustomerDetailPage],
  ["/customers/:id/edit", CustomerFormPage],
  ["/customers/:customerId/gardens/new", GardenFormPage],
  ["/gardens/:id", GardenPage],
  ["/gardens/:id/edit", GardenFormPage],
  ["/requests", RequestsPage],
  ["/requests/new", NewRequestPage],
  ["/requests/:id", RequestDetailPage],
];

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute allowPendingPasswordChange>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute requireRole="OWNER">
                <TeamPage />
              </ProtectedRoute>
            }
          />
          {STAFF_PAGES.map(([path, Page]) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute>
                  <Page />
                </ProtectedRoute>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

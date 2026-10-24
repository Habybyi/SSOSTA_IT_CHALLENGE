import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = ({ children, requireRole, allowPendingPasswordChange = false, allowCustomer = false }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (user.mustChangePassword && !allowPendingPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }
  if (user.role === "CUSTOMER" && !allowCustomer && requireRole !== "CUSTOMER") return <Navigate to="/portal" replace />;
  if (requireRole && user.role !== requireRole) return <Navigate to="/dashboard" replace />;

  return children;
};

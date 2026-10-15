import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = ({ children, requireRole, allowPendingPasswordChange = false }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && !allowPendingPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }
  if (requireRole && user.role !== requireRole) return <Navigate to="/dashboard" replace />;

  return children;
};

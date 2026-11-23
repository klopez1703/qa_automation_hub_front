import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles, anyPermissions }) {
  const { auth } = useAuth();
  const location = useLocation();
  const savedAuth = JSON.parse(localStorage.getItem("qa-hub-auth") || "null");

  const token = auth?.token || savedAuth?.token;
  const user = savedAuth?.user || auth?.user;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/cambiar-contrasena" replace />;
  }

  const rawRole = typeof user.role === "string" ? user.role : user.role?.name || "";
  const normalizedRole = rawRole.toUpperCase();

  if (normalizedRole === "ADMIN") {
    return children;
  }

  const userPermissions = user.permissions || [];
  const hasPermission =
    Array.isArray(anyPermissions) &&
    anyPermissions.some(
      (perm) => userPermissions.includes("*") || userPermissions.includes(perm)
    );

  const hasRole =
    Array.isArray(roles) &&
    roles.length > 0 &&
    roles.map((r) => r.toUpperCase()).includes(normalizedRole);

  if ((roles && roles.length > 0) || (anyPermissions && anyPermissions.length > 0)) {
    if (!hasRole && !hasPermission) {
      return location.pathname === "/tickets" ? null : (
        <Navigate to="/tickets" replace />
      );
    }
  }

  return children;
}
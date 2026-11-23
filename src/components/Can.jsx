// components/Can.jsx
import { useAuth } from "../context/AuthContext";

export function Can({ action, children, fallback = null }) {
  const { user } = useAuth();
  const isAdmin = user?.role?.name === "Admin";
  const allowed = isAdmin || user?.permissions?.includes(action);

  return allowed ? children : fallback;
}
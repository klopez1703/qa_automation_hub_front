import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function PublicRoute() {
  const { auth } = useAuth();
  
  // Respaldo directo a localStorage para evitar parpadeos durante la carga
  const savedAuth = localStorage.getItem("qa-hub-auth");

  if (auth?.token || savedAuth) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
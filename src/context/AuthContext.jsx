import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64);
    const decoded = JSON.parse(decodedJson);
    if (!decoded.exp) return false;
    return Date.now() >= decoded.exp * 1000;
  } catch (e) {
    return true;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('qa-hub-auth');
    if (!saved) return null;

    try {
      const parsed = JSON.parse(saved);
      if (parsed?.token && !isTokenExpired(parsed.token)) {
        return parsed;
      }
    } catch (e) {
      console.error('Error al analizar token:', e);
    }

    localStorage.removeItem('qa-hub-auth');
    return null;
  });

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    
    // GUARDAR EN STORAGE ANTES DE CAMBIAR EL ESTADO
    if (data?.token) {
      localStorage.setItem('qa-hub-auth', JSON.stringify(data));
      setAuth(data);
    }
    return data;
  }

  function logout() {
    localStorage.removeItem('qa-hub-auth');
    setAuth(null);
    window.location.href = '/login';
  }

  useEffect(() => {
    if (auth?.token && isTokenExpired(auth.token)) {
      logout();
    }
  }, [auth]);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
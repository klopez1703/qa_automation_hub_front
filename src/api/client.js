const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  // 1. Parsear la respuesta ANTES de evaluar res.status o data?.code
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  // 2. Detección de sesión expirada o cuenta desactivada (solo fuera de /auth/login)
  if (!path.includes('/auth/login')) {
    if (res.status === 401 && data?.code === 'ACCOUNT_INACTIVE') {
      localStorage.removeItem('qa-hub-auth');
      window.location.href = '/login?inactive=1';
      throw new Error(data.error || 'Tu cuenta ha sido desactivada.');
    }

    if (res.status === 401) {
      localStorage.removeItem('qa-hub-auth');
      window.location.href = '/login?expired=1';
      throw new Error('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
    }
  }

  // 3. Manejo estándar de errores (incluye el 403 de cuenta inactiva en /auth/login)
  if (!res.ok) {
    const message =
      (isJson && (data?.error || data?.message)) ||
      (typeof data === 'string' && data) ||
      'Ocurrió un error inesperado.';
    throw new Error(message);
  }

  return data;
}

export const api = {
  get: (path, token) => request(path, { token }),
  post: (path, body, token) => request(path, { method: 'POST', body, token }),
  put: (path, body, token) => request(path, { method: 'PUT', body, token }),
  patch: (path, body, token) => request(path, { method: 'PATCH', body, token }),
  del: (path, token) => request(path, { method: 'DELETE', token }),
};
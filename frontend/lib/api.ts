/**
 * lib/api.ts — Utilidades de fetch autenticado para Alzak Flow
 * Todos los endpoints de la API pasan por aquí.
 */

function backendBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:3000';
  return `http://${window.location.hostname}:3000`;
}

/**
 * Fetch autenticado: inyecta el JWT de localStorage en cada petición.
 */
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('alzak_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(`${backendBase()}${path}`, { ...options, headers });
}

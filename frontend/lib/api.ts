/**
 * lib/api.ts — Utilidades de fetch autenticado para Alzak Flow
 * Todos los endpoints de la API pasan por aquí.
 */

/**
 * Sube un archivo PDF/DOCX al endpoint /upload/texto y devuelve
 * el texto extraído. Usa multipart/form-data — NO añadir Content-Type manual.
 */
export async function uploadFileForText(file: File): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('alzak_token') : null;
  const form  = new FormData();
  form.append('file', file);

  const res = await fetch(`${backendBase()}/upload/texto`, {
    method:  'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  const data = await res.json() as { texto: string };
  return data.texto;
}

export function backendBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:3005';
  return `http://${window.location.hostname}:3005`;
}

/**
 * Fetch autenticado: inyecta el JWT de localStorage en cada petición.
 * Si el servidor responde 401, dispara el evento "alzak:unauthorized"
 * para que AuthContext cierre la sesión automáticamente.
 */
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('alzak_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${backendBase()}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token expirado o inválido → limpiar sesión
    window.dispatchEvent(new CustomEvent('alzak:unauthorized'));
  }

  return res;
}

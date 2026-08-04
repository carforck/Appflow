/**
 * lib/api.ts — Utilidades de fetch autenticado para Alzak Flow
 * Todos los endpoints de la API pasan por aquí.
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
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url && url.length > 0) return url;
  // Sin URL externa: proxy del dev server (browser → :3002/api-proxy → :3005)
  if (typeof window !== 'undefined') return '/api-proxy';
  return 'http://localhost:3005';
}

export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('alzak_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${backendBase()}${path}`, { ...options, headers });

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('alzak:unauthorized'));
  }

  return res;
}

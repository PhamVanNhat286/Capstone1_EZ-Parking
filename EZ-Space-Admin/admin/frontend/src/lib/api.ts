let csrfToken = '';
let unauthorizedHandler: (() => void) | null = null;

export function setCsrfToken(token: string): void {
  csrfToken = token;
}

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

export async function api<T = unknown>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' = 'GET',
  data?: Record<string, unknown>,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const url = new URL(`/api/admin/${cleanEndpoint}`, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  const init: RequestInit = {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers
  };

  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    init.body = JSON.stringify(data || {});
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), init);
  } catch {
    throw new Error('Không thể kết nối tới máy chủ Backend Node.js (cổng 8000).');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Phản hồi từ máy chủ không hợp lệ.');
  }

  const result = await response.json();
  if (result && typeof result.csrf === 'string' && result.csrf) {
    csrfToken = result.csrf;
  }
  if (!response.ok) {
    if (response.status === 401 && !['login', 'auth', 'sso'].includes(cleanEndpoint)) {
      unauthorizedHandler?.();
    }
    throw new Error(result?.error || `Lỗi HTTP ${response.status}`);
  }
  return result as T;
}

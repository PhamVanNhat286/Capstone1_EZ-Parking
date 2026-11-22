let csrfToken = '';

export function setCsrfToken(token: string): void {
  csrfToken = token;
}

export async function api<T = unknown>(
  action: string,
  method: 'GET' | 'POST' = 'GET',
  data?: Record<string, unknown>,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const url = new URL('/api/admin', window.location.origin);
  url.searchParams.set('action', action);
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
  if (!response.ok) {
    throw new Error(result?.error || `Lỗi HTTP ${response.status}`);
  }
  return result as T;
}

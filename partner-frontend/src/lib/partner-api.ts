import type { PartnerData } from './database-model';

export type PartnerSnapshot = { manager_id: string; synced_at: string; data: PartnerData };
export type PartnerEditor = { kind: 'lot' | 'slot' | 'pricing' | 'profile'; id?: string };
export class PartnerApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export async function partnerRequest<T>(path: string, token: string | null, method = 'GET', body?: object, fetcher: typeof fetch = fetch): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(`/api${path}`, {
      method, cache: 'no-store', signal: AbortSignal.timeout(20000),
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch { throw new PartnerApiError(0, 'Không kết nối được backend. Kiểm tra backend và cấu hình PostgreSQL rồi thử lại.'); }
  let result: { success: boolean; message?: string; data?: T };
  try { result = await response.json(); }
  catch { throw new PartnerApiError(response.status, 'Backend chưa sẵn sàng hoặc trả về dữ liệu không hợp lệ.'); }
  if (!response.ok || !result.success || !result.data) throw new PartnerApiError(response.status, result.message ?? 'Không thể xử lý yêu cầu.');
  return result.data;
}

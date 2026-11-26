"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { PartnerData } from '@/lib/database-model';
import { PartnerApiError, partnerRequest, type PartnerSnapshot, type PartnerEditor } from '@/lib/partner-api';
import PartnerSignIn from './PartnerSignIn';

type Workspace = {
  db: PartnerData; managerId: string; selectedId: string; select: (id: string) => void;
  refresh: () => Promise<void>; saveEditor: (editor: PartnerEditor, input: object) => Promise<void>;
  mutate: (path: string, input: object, method?: string) => Promise<void>;
  call: <T>(path: string, input: object, write?: boolean) => Promise<T>;
  busy: boolean; syncError: string; syncedAt: string; signOut: () => void;
};
const Context = createContext<Workspace | null>(null);
const storageKey = 'ez_space_partner_token';

export default function SqlWorkspace({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const requestSeq = useRef(0);
  const writing = useRef(false);
  const [snapshot, setSnapshot] = useState<PartnerSnapshot | null>(null);
  const [selectedId, select] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  const signOut = useCallback(() => {
    tokenRef.current = null; requestSeq.current++;
    sessionStorage.removeItem(storageKey);
    setToken(null); setSnapshot(null); select(''); setSyncError('');
  }, []);
  const refresh = useCallback(async () => {
    const currentToken = tokenRef.current;
    if (!currentToken) return;
    const seq = ++requestSeq.current;
    try {
      const next = await partnerRequest<PartnerSnapshot>('/partner/snapshot', currentToken);
      if (currentToken !== tokenRef.current || seq !== requestSeq.current) return;
      setSnapshot(next); setSyncError('');
      select(current => next.data.parking_lots.some(l => l.id === current) ? current : next.data.parking_lots[0]?.id ?? '');
    } catch (cause) {
      if (currentToken !== tokenRef.current || seq !== requestSeq.current) return;
      if (cause instanceof PartnerApiError && [401, 403].includes(cause.status)) {
        signOut(); setAuthMessage(cause.message);
      } else setSyncError(cause instanceof Error ? cause.message : 'Không thể đồng bộ dữ liệu.');
      throw cause;
    }
  }, [signOut]);

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    tokenRef.current = saved; setToken(saved); setReady(true);
  }, []);
  useEffect(() => {
    if (!token) return;
    const update = () => { if (!document.hidden) void refresh().catch(() => {}); };
    update();
    const timer = setInterval(update, 15000);
    window.addEventListener('focus', update); document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); requestSeq.current++; };
  }, [token, refresh]);

  const mutate = async (path: string, input: object, method = 'POST') => {
    if (writing.current) throw new Error('Một thay đổi đang được lưu. Vui lòng chờ.');
    const currentToken = tokenRef.current;
    if (!currentToken) throw new Error('Vui lòng đăng nhập lại.');
    writing.current = true; setBusy(true);
    try {
      await partnerRequest(`/partner${path}`, currentToken, method, input);
      // The write already committed. A refresh failure must not invite a duplicate POST.
      await refresh().catch(() => {});
    } catch (cause) {
      if (cause instanceof PartnerApiError && cause.status === 401) signOut();
      throw cause;
    } finally { writing.current = false; setBusy(false); }
  };
  // POST that returns its data (Gate Kiosk). Writes are serialized like mutate and refresh the snapshot.
  const call = async <T,>(path: string, input: object, write = false): Promise<T> => {
    const currentToken = tokenRef.current;
    if (!currentToken) throw new Error('Vui lòng đăng nhập lại.');
    if (write && writing.current) throw new Error('Một thay đổi đang được lưu. Vui lòng chờ.');
    if (write) { writing.current = true; setBusy(true); }
    try {
      const result = await partnerRequest<T>(`/partner${path}`, currentToken, 'POST', input);
      if (write) await refresh().catch(() => {});
      return result;
    } catch (cause) {
      if (cause instanceof PartnerApiError && cause.status === 401) signOut();
      throw cause;
    } finally { if (write) { writing.current = false; setBusy(false); } }
  };
  const saveEditor = async (editor: PartnerEditor, input: object) => {
    if (editor.kind === 'profile') await mutate('/profile', input, 'PATCH');
    else {
      const resource = { lot: 'lots', slot: 'slots', pricing: 'pricing' }[editor.kind];
      await mutate(`/${resource}${editor.id ? `/${editor.id}` : ''}`, input, editor.id ? 'PUT' : 'POST');
    }
  };
  if (!ready) return <p role="status" style={{ padding: 32 }}>Đang khởi tạo Partner…</p>;
  if (!token) return <PartnerSignIn message={authMessage} onLogin={next => {
    tokenRef.current = next; sessionStorage.setItem(storageKey, next); setAuthMessage(''); setSyncError(''); setToken(next);
  }} />;
  if (!snapshot) return <div style={{ maxWidth: 480, padding: 32, margin: '80px auto', lineHeight: 1.8 }}>
    <h1>EZ-Space Partner</h1><p role={syncError ? 'alert' : 'status'}>{syncError || 'Đang lấy dữ liệu từ PostgreSQL…'}</p>
    {syncError && <><button onClick={() => void refresh().catch(() => {})}>Thử kết nối lại</button><span> · </span><button onClick={signOut}>Đăng nhập lại</button></>}
  </div>;
  return <Context.Provider value={{ db: snapshot.data, managerId: snapshot.manager_id, selectedId, select, refresh, saveEditor, mutate, call, busy, syncError, syncedAt: snapshot.synced_at, signOut }}>{children}</Context.Provider>;
}
export function useSqlWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('SqlWorkspace is required.');
  return value;
}

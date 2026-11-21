"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createSqlPreview } from '@/lib/database-seed';
import { managedLots, type PartnerData } from '@/lib/database-model';

type Workspace = { db: PartnerData; managerId: string; selectedId: string; select: (id: string) => void; apply: (change: (db: PartnerData) => PartnerData) => void; reset: () => void };
const Context = createContext<Workspace | null>(null);
export default function SqlWorkspace({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<PartnerData | null>(null);
  const [selectedId, select] = useState('1');
  useEffect(() => setDb(createSqlPreview()), []);
  if (!db) return <p style={{ padding: 32 }} role="status">Đang tải bản xem thử Partner…</p>;
  const managerId = '2'; // Public SQL seed manager. This is not authentication.
  const selected = managedLots(db, managerId).some(l => l.id === selectedId) ? selectedId : managedLots(db, managerId)[0]?.id ?? '';
  return <Context.Provider value={{ db, managerId, selectedId: selected, select, apply: change => setDb(change(db)), reset: () => { setDb(createSqlPreview()); select('1'); } }}>{children}</Context.Provider>;
}
export function useSqlWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('SqlWorkspace is required.');
  return value;
}

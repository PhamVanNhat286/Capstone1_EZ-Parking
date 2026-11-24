'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdmin } from '@/context/AdminContext';
import { api } from '@/lib/api';

export function useAdminPageData<T>(endpoint: string, errorFallback: string) {
  const { authReady, refreshSummary, refreshTick, setRefreshing, setErrorBanner, modal } =
    useAdmin();

  const [data, setData] = useState<T | null>(null);
  const [loadError, setLoadError] = useState('');
  const reqIdRef = useRef(0);

  const reload = useCallback(
    async (silent = false) => {
      if (!silent && (document.hidden || modal.open)) return;
      const id = ++reqIdRef.current;
      setRefreshing(true);
      try {
        const [, res] = await Promise.all([refreshSummary(), api<T>(endpoint)]);
        if (id !== reqIdRef.current) return;
        setData(res);
        setLoadError('');
        setErrorBanner('');
      } catch (err) {
        if (id !== reqIdRef.current) return;
        const msg = err instanceof Error ? err.message : errorFallback;
        setLoadError(msg);
        setErrorBanner(msg);
      } finally {
        setRefreshing(false);
      }
    },
    [endpoint, errorFallback, modal.open, refreshSummary, setErrorBanner, setRefreshing]
  );

  useEffect(() => {
    if (!authReady) return;
    void reload(true);
  }, [authReady, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authReady) return;
    const timer = setInterval(() => void reload(false), 20000);
    return () => clearInterval(timer);
  }, [authReady, reload]);

  return { data, loadError, reload };
}


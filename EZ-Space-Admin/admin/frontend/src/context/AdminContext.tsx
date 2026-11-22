'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { ConfirmDialog, ConfirmDialogOptions } from '@/components/ConfirmDialog';
import { api, setCsrfToken } from '@/lib/api';
import { AuthResponse, SummaryResponse } from '@/lib/types';

export interface ToastState {
  visible: boolean;
  message: string;
  type: 'ok' | 'bad';
}

export interface ModalState {
  open: boolean;
  title: string;
  isDialog: boolean;
  content: React.ReactNode;
}

interface AdminContextValue {
  authReady: boolean;
  adminName: string;
  adminEmail: string;
  summary: SummaryResponse | null;
  syncTime: string;
  refreshTick: number;
  refreshing: boolean;
  setRefreshing: (val: boolean) => void;
  errorBanner: string;
  setErrorBanner: (msg: string) => void;
  toast: ToastState;
  modal: ModalState;
  notice: (message: string, type?: 'ok' | 'bad') => void;
  openModal: (title: string, content: React.ReactNode, isDialog?: boolean) => void;
  closeModal: () => void;
  confirmAction: (
    options: ConfirmDialogOptions
  ) => Promise<{ confirmed: true; reason: string } | null>;
  refreshSummary: () => Promise<SummaryResponse | null>;
  triggerRefresh: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [adminName, setAdminName] = useState('Admin Hệ Thống');
  const [adminEmail, setAdminEmail] = useState('admin@ezspace.vn');
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [syncTime, setSyncTime] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'ok'
  });
  const [modal, setModal] = useState<ModalState>({
    open: false,
    title: 'Thông tin',
    isDialog: false,
    content: null
  });

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogResolverRef = useRef<
    ((res: { confirmed: true; reason: string } | null) => void) | null
  >(null);

  const notice = useCallback((message: string, type: 'ok' | 'bad' = 'ok') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visible: true, message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3600);
  }, []);

  const closeModal = useCallback(() => {
    if (dialogResolverRef.current) {
      const resolve = dialogResolverRef.current;
      dialogResolverRef.current = null;
      resolve(null);
    }
    setModal(prev => ({ ...prev, open: false, isDialog: false }));
  }, []);

  const openModal = useCallback(
    (title: string, content: React.ReactNode, isDialog = false) => {
      if (dialogResolverRef.current) {
        const resolve = dialogResolverRef.current;
        dialogResolverRef.current = null;
        resolve(null);
      }
      setModal({ open: true, title, content, isDialog });
    },
    []
  );

  const confirmAction = useCallback((options: ConfirmDialogOptions) => {
    if (dialogResolverRef.current) {
      const prevResolve = dialogResolverRef.current;
      dialogResolverRef.current = null;
      prevResolve(null);
    }
    return new Promise<{ confirmed: true; reason: string } | null>(resolve => {
      dialogResolverRef.current = resolve;
      setModal({
        open: true,
        title: options.title,
        isDialog: true,
        content: (
          <ConfirmDialog
            options={options}
            onCancel={() => {
              const done = dialogResolverRef.current;
              dialogResolverRef.current = null;
              setModal(prev => ({ ...prev, open: false, isDialog: false }));
              if (done) done(null);
            }}
            onConfirm={reason => {
              const done = dialogResolverRef.current;
              dialogResolverRef.current = null;
              setModal(prev => ({ ...prev, open: false, isDialog: false }));
              if (done) done({ confirmed: true, reason });
            }}
          />
        )
      });
    });
  }, []);

  const refreshSummary = useCallback(async () => {
    try {
      const s = await api<SummaryResponse>('summary');
      setSummary(s);
      if (s.server_time) {
        setSyncTime(`Cập nhật: ${String(s.server_time).slice(11, 19)}`);
      }
      return s;
    } catch {
      return null;
    }
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTick(prev => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const auth = await api<AuthResponse>('auth');
        if (!active) return;
        setCsrfToken(auth.csrf);
        setAdminName(auth.user || 'Admin Hệ Thống');
        setAdminEmail(auth.email || 'admin@ezspace.vn');
        setAuthReady(true);
      } catch (err) {
        if (!active) return;
        setErrorBanner(
          err instanceof Error ? err.message : 'Không thể kết nối máy chủ quản trị.'
        );
        setAuthReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleEsc(ev: KeyboardEvent) {
      if (ev.key === 'Escape' && modal.open) {
        closeModal();
      }
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [modal.open, closeModal]);

  return (
    <AdminContext.Provider
      value={{
        authReady,
        adminName,
        adminEmail,
        summary,
        syncTime,
        refreshTick,
        refreshing,
        setRefreshing,
        errorBanner,
        setErrorBanner,
        toast,
        modal,
        notice,
        openModal,
        closeModal,
        confirmAction,
        refreshSummary,
        triggerRefresh
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
}


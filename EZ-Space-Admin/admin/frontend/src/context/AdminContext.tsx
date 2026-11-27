'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { ConfirmDialog, ConfirmDialogOptions } from '@/components/ConfirmDialog';
import { api, setCsrfToken, setUnauthorizedHandler } from '@/lib/api';
import { AuthResponse, SummaryResponse } from '@/lib/types';

interface ToastState {
  visible: boolean;
  message: string;
  type: 'ok' | 'bad';
}

interface ModalState {
  open: boolean;
  title: string;
  isDialog: boolean;
  content: ReactNode;
}

interface AdminContextValue {
  authReady: boolean;
  authenticated: boolean;
  authMessage: string;
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
  openModal: (title: string, content: ReactNode, isDialog?: boolean) => void;
  closeModal: () => void;
  confirmAction: (
    options: ConfirmDialogOptions
  ) => Promise<{ confirmed: true; reason: string } | null>;
  refreshSummary: () => Promise<SummaryResponse | null>;
  triggerRefresh: () => void;
  completeLogin: (name: string, email: string, csrf?: string) => void;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
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
    (title: string, content: ReactNode, isDialog = false) => {
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

  const completeLogin = useCallback(
    (name: string, email: string, csrf?: string) => {
      if (csrf) setCsrfToken(csrf);
      setAdminName(name);
      setAdminEmail(email);
      setAuthMessage('');
      setErrorBanner('');
      setAuthenticated(true);
      setRefreshTick(prev => prev + 1);
      notice('Đăng nhập thành công!');
    },
    [notice]
  );

  const logout = useCallback(async () => {
    try {
      await api('logout', 'POST');
    } catch {
      // ignore
    }
    setAuthenticated(false);
    setAdminName('');
    setAdminEmail('');
    setSummary(null);
    setSyncTime('');
    setErrorBanner('');
    setAuthMessage('');
    closeModal();
    notice('Đã đăng xuất khỏi hệ thống quản trị.');
    try {
      const auth = await api<AuthResponse>('auth');
      setCsrfToken(auth.csrf);
    } catch {
      // ignore
    }
  }, [closeModal, notice]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthenticated(false);
      setAdminName('');
      setAdminEmail('');
      setSummary(null);
      setSyncTime('');
      setAuthMessage('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
      closeModal();
    });
    return () => setUnauthorizedHandler(null);
  }, [closeModal]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const auth = await api<AuthResponse>('auth');
        if (!active) return;
        setCsrfToken(auth.csrf);

        const url = new URL(window.location.href);
        const ssoToken = url.searchParams.get('token');
        if (ssoToken) {
          url.searchParams.delete('token');
          window.history.replaceState({}, '', url.pathname + url.search);
          try {
            const sso = await api<AuthResponse>('sso', 'POST', { token: ssoToken });
            if (!active) return;
            if (sso.csrf) setCsrfToken(sso.csrf);
            setAdminName(sso.user || '');
            setAdminEmail(sso.email || '');
            setAuthenticated(true);
            setAuthReady(true);
            return;
          } catch (ssoErr) {
            if (!active) return;
            setAuthMessage(
              ssoErr instanceof Error ? ssoErr.message : 'Phiên SSO không hợp lệ.'
            );
          }
        }

        if (auth.authenticated) {
          setAdminName(auth.user || '');
          setAdminEmail(auth.email || '');
          setAuthenticated(true);
        }
        setAuthReady(true);
      } catch (err) {
        if (!active) return;
        setAuthMessage(
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
        authenticated,
        authMessage,
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
        triggerRefresh,
        completeLogin,
        logout
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

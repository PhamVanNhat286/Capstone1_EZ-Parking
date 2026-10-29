import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Vehicle = {
  id: string;
  plate: string;
  type: "Sedan" | "SUV" | "EV";
  name: string;
  isPrimary?: boolean;
  evBodyType?: "Sedan" | "SUV"; // Dáng xe của xe điện (Sedan hoặc SUV)
};

export type BookingStatus = "holding" | "paid" | "entered" | "completed" | "forfeited" | "cancelled";

export type Booking = {
  id: string;
  backendId?: number;
  lotId: string;
  spotId: string;
  vehicleId: string;
  estimatedHours?: number;
  startTime?: string;
  endTime?: string;
  status: BookingStatus;
  holdExpiresAt: number; // timestamp
  arrivalExpiresAt?: number; // timestamp
  enteredAt?: number; // timestamp
  exitedAt?: number; // timestamp
  paymentMethod?: "vnpay" | "momo" | "card";
  createdAt: number;
};


export type AIMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
  cards?: { lotId: string; reason: string; tab?: string }[];
  chips?: string[];
  timestamp: number;
};

export const getUserChatKey = (user?: { email?: string; phone?: string } | null): string => {
  if (!user) return "guest";
  const email = user.email?.trim().toLowerCase();
  if (email) return `user_${email}`;
  const phone = user.phone?.trim();
  if (phone) return `user_${phone}`;
  return "guest";
};

type StoreState = {
  user: { name: string; phone: string; email?: string; token?: string; role?: string; isLoggedIn: boolean } | null;
  vehicles: Vehicle[];
  setVehicles: (vehicles: Vehicle[]) => void;
  activeBooking: Booking | null;
  history: Booking[];
  toasts: { id: string; message: string; type?: "info" | "error" | "success" }[];
  settings: { theme: "light" | "dark"; notifications: boolean };
  setSettings: (updates: Partial<{ theme: "light" | "dark"; notifications: boolean }>) => void;
  linkedWallet: boolean;
  toggleWallet: () => void;
  addVehicle: (v: Vehicle) => void;
  updateVehicle: (id: string, v: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  setDefaultVehicle: (id: string) => void;
  reorderVehicles: (vehicles: Vehicle[]) => void;
  
  aiMessages: AIMessage[];
  chatHistories?: Record<string, AIMessage[]>;
  addAiMessage: (msg: AIMessage) => void;
  clearAiMessages: () => void;

  favoriteLots: string[];
  toggleFavoriteLot: (lotId: string) => void;

  // Actions
  login: (userData?: { name?: string; phone?: string; email?: string; token?: string; role?: string; vehicles?: Vehicle[] }) => void;
  updateUser: (data: Partial<{ name: string; phone: string; email: string }>) => void;
  logout: () => void;
  holdSpot: (lotId: string, spotId: string, vehicleId: string, estimatedHours?: number, startTime?: string, endTime?: string, backendId?: number, serverHoldExpiresAt?: number) => void;
  setBookingHours: (hours: number, startTime?: string, endTime?: string) => void;
  isDemo: boolean;
  setDemo: (val: boolean) => void;
  lastPaymentMethod: "vnpay" | "momo" | "card" | null;
  payDeposit: (method: "vnpay" | "momo" | "card") => void;
  cancelBooking: () => void;
  releaseSpot: () => void;
  completeBooking: () => void;
  lateIPNRefund: () => void;
  markEntered: () => void;
  markCompleted: () => void;
  markExpired: () => void;
  fastForward: () => void;
  addToast: (message: string, type?: "info" | "error" | "success") => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  tick: () => void; // call every second to check expirations
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      user: null,
      vehicles: [],
      activeBooking: null,
      history: [],
      toasts: [],
      isDemo: false,
      lastPaymentMethod: null,
      settings: { theme: "light", notifications: true },
      linkedWallet: false,

      setSettings: (updates) => set((state) => ({ settings: { ...state.settings, ...updates } })),
      toggleWallet: () => set((state) => ({ linkedWallet: !state.linkedWallet })),
      
      setVehicles: (vehicles) => set({ vehicles }),
      addVehicle: (v) => set((state) => ({ vehicles: [...state.vehicles, v] })),
      updateVehicle: (id, v) => set((state) => ({ vehicles: state.vehicles.map(x => x.id === id ? { ...x, ...v } : x) })),
      deleteVehicle: (id) => set((state) => ({ vehicles: state.vehicles.filter(x => x.id !== id) })),
      setDefaultVehicle: (id) => set((state) => ({ 
        vehicles: state.vehicles.map(x => ({ ...x, isPrimary: x.id === id })) 
      })),
      reorderVehicles: (vehicles) => set({ vehicles }),

      aiMessages: [],
      chatHistories: {},
      addAiMessage: (msg) =>
        set((state) => {
          const key = getUserChatKey(state.user);
          const currentHistories = state.chatHistories || {};
          const currentList = currentHistories[key] || state.aiMessages || [];
          const updated = [...currentList, msg];
          return {
            aiMessages: updated,
            chatHistories: {
              ...currentHistories,
              [key]: updated,
            },
          };
        }),
      clearAiMessages: () =>
        set((state) => {
          const key = getUserChatKey(state.user);
          const currentHistories = state.chatHistories || {};
          return {
            aiMessages: [],
            chatHistories: {
              ...currentHistories,
              [key]: [],
            },
          };
        }),

      favoriteLots: [],
      toggleFavoriteLot: (lotId: string) =>
        set((state) => {
          const current = state.favoriteLots || [];
          const exists =
            current.includes(lotId) ||
            ((lotId === "3" || lotId === "san-bay-t1") && current.some((id) => id === "3" || id === "san-bay-t1")) ||
            ((lotId === "1" || lotId === "hai-chau-a") && current.some((id) => id === "1" || id === "hai-chau-a")) ||
            ((lotId === "2" || lotId === "cau-rong") && current.some((id) => id === "2" || id === "cau-rong"));

          let next: string[];
          if (exists) {
            next = current.filter((id) => {
              if (id === lotId) return false;
              if ((lotId === "3" || lotId === "san-bay-t1") && (id === "3" || id === "san-bay-t1")) return false;
              if ((lotId === "1" || lotId === "hai-chau-a") && (id === "1" || id === "hai-chau-a")) return false;
              if ((lotId === "2" || lotId === "cau-rong") && (id === "2" || id === "cau-rong")) return false;
              return true;
            });
          } else {
            next = [...current, lotId];
          }

          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("ez_favorite_lots", JSON.stringify(next));
            } catch {}
          }
          return { favoriteLots: next };
        }),

      setDemo: (val) => set({ isDemo: val }),
      login: (userData) => {
        const newUser = {
          name: userData?.name || "Người dùng",
          phone: userData?.phone || "",
          email: userData?.email || "",
          token: userData?.token,
          role: userData?.role || "customer",
          isLoggedIn: true,
        };
        const key = getUserChatKey(newUser);
        set((state) => {
          const histories = state.chatHistories || {};
          return {
            user: newUser,
            vehicles: userData?.vehicles || [],
            // Chỉ tải đúng lịch sử chat của tài khoản này
            aiMessages: histories[key] || [],
          };
        });
      },
      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("ezspace_token");
          // Xóa cookie cho Edge Middleware
          document.cookie = "ezspace_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
          document.cookie = "ezspace_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
        }
        set((state) => {
          const histories = state.chatHistories || {};
          return {
            user: null,
            vehicles: [],
            activeBooking: null,
            history: [],
            // Đăng xuất: chuyển sang phiên khách hoặc làm sạch, không để lộ dữ liệu tài khoản cũ
            aiMessages: histories["guest"] || [],
          };
        });
      },
      
      holdSpot: (lotId, spotId, vehicleId, estimatedHours = 2, startTime, endTime, backendId, serverHoldExpiresAt) => {
        const newBooking: Booking = {
          id: backendId ? `EZ-${backendId}` : "EZ-" + Math.floor(Math.random() * 10000),
          backendId,
          lotId,
          spotId,
          vehicleId,
          estimatedHours,
          startTime,
          endTime,
          status: "holding",
          holdExpiresAt: serverHoldExpiresAt || (Date.now() + 10 * 60 * 1000), // 10 minutes from now
          createdAt: Date.now(),
        };
        set({ activeBooking: newBooking });
      },


      setBookingHours: (hours, startTime, endTime) => set((state) => ({
        activeBooking: state.activeBooking
          ? {
              ...state.activeBooking,
              estimatedHours: Math.max(1, Math.min(24, hours)),
              ...(startTime ? { startTime } : {}),
              ...(endTime ? { endTime } : {}),
            }
          : null,
      })),

      payDeposit: (method) => {
        const { activeBooking } = get();
        if (!activeBooking) return;
        set({
          lastPaymentMethod: method,
          activeBooking: {
            ...activeBooking,
            status: "paid",
            paymentMethod: method,
            arrivalExpiresAt: Date.now() + 20 * 60 * 1000, // 20 minutes to arrive
          },
        });
      },

      cancelBooking: () => {
        const { activeBooking, history } = get();
        if (!activeBooking) return;
        
        const isRefundable = (Date.now() - activeBooking.createdAt) < 5 * 60 * 1000;
        
        set({
          activeBooking: null,
          history: [{ ...activeBooking, status: isRefundable ? "cancelled" : "forfeited" }, ...history],
        });
      },

      releaseSpot: () => {
        set({ activeBooking: null });
      },

      lateIPNRefund: () => {
        const { activeBooking, history } = get();
        if (!activeBooking) return;
        set({
          activeBooking: null,
          history: [{ ...activeBooking, status: "cancelled" }, ...history],
        });
      },

      markEntered: () => {
        const { activeBooking } = get();
        if (!activeBooking) return;
        set({
          activeBooking: { ...activeBooking, status: "entered", enteredAt: Date.now() },
        });
      },

      markCompleted: () => {
        const { activeBooking, history } = get();
        if (!activeBooking) return;
        set({
          activeBooking: null,
          history: [{ ...activeBooking, status: "completed", exitedAt: Date.now() }, ...history],
        });
      },

      markExpired: () => {
        const { activeBooking, history } = get();
        if (!activeBooking) return;
        set({
          activeBooking: null,
          history: [{ ...activeBooking, status: "forfeited" }, ...history],
        });
      },

      fastForward: () => {
        const { activeBooking } = get();
        if (!activeBooking) return;
        set({
          activeBooking: { ...activeBooking, arrivalExpiresAt: Date.now() - 1000 }
        });
      },

      completeBooking: () => {
        const { activeBooking, history } = get();
        if (!activeBooking) return;
        set({
          activeBooking: null,
          history: [{ ...activeBooking, status: "completed" }, ...history],
        });
      },

      addToast: (message, type = "info") => {
        const id = Math.random().toString();
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => get().removeToast(id), 3000);
      },

      removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      },

      clearToasts: () => {
        set({ toasts: [] });
      },

      tick: () => {
        const { activeBooking, history, addToast } = get();
        if (!activeBooking) return;
        const now = Date.now();
        
        if (activeBooking.status === "holding" && now > activeBooking.holdExpiresAt) {
          addToast("Hết thời gian giữ chỗ. Đã tự động hủy.", "error");
          set({
            activeBooking: null,
            history: [{ ...activeBooking, status: "cancelled" }, ...history],
          });
        }
        
        if (activeBooking.status === "paid" && activeBooking.arrivalExpiresAt && now > activeBooking.arrivalExpiresAt) {
          addToast("Quá thời gian đến bãi. Tiền cọc đã bị giữ lại.", "error");
          set({
            activeBooking: null,
            history: [{ ...activeBooking, status: "forfeited" }, ...history],
          });
        }
      },
    }),
    {
      name: "ez-space-storage",
      version: 3,
      onRehydrateStorage: () => (state) => {
        if (state) {
          const key = getUserChatKey(state.user);
          const histories = state.chatHistories || {};
          state.aiMessages = histories[key] || [];
        }
      },
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([k]) => k !== "toasts")
        ) as any,
      migrate: (persistedState: any) => {
        if (persistedState) {
          if (Array.isArray(persistedState.vehicles)) {
            // Remove old hardcoded mock vehicles
            persistedState.vehicles = persistedState.vehicles.filter((v: any) => {
              const isMockId = v.id === "v1" || v.id === "v2" || v.id === "v3";
              const isMockPlate = v.plate === "43A-123.45" && v.name === "Toyota Fortuner";
              return !isMockId && !isMockPlate;
            });
          }
          if (!persistedState.chatHistories) {
            persistedState.chatHistories = {};
          }
          if (Array.isArray(persistedState.aiMessages) && persistedState.aiMessages.length > 0) {
            const key = getUserChatKey(persistedState.user);
            if (!persistedState.chatHistories[key] || persistedState.chatHistories[key].length === 0) {
              persistedState.chatHistories[key] = persistedState.aiMessages;
            }
          }
        }
        return persistedState;
      },
    }
  )
);

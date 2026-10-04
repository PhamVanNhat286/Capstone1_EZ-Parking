import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Vehicle = {
  id: string;
  plate: string;
  type: "Sedan" | "SUV" | "EV";
  name: string;
  isPrimary?: boolean;
};

export type BookingStatus = "holding" | "paid" | "entered" | "completed" | "forfeited" | "cancelled";

export type Booking = {
  id: string;
  lotId: string;
  spotId: string;
  vehicleId: string;
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

type StoreState = {
  user: { name: string; phone: string; isLoggedIn: boolean } | null;
  vehicles: Vehicle[];
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
  addAiMessage: (msg: AIMessage) => void;
  clearAiMessages: () => void;

  // Actions
  login: () => void;
  logout: () => void;
  holdSpot: (lotId: string, spotId: string, vehicleId: string) => void;
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
  tick: () => void; // call every second to check expirations
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      user: null,
      vehicles: [
        { id: "v1", name: "Toyota Fortuner", plate: "43A-123.45", type: "SUV", isPrimary: true },
        { id: "v2", name: "Honda Civic", plate: "43A-678.90", type: "Sedan" },
      ],
      activeBooking: null,
      history: [],
      toasts: [],
      isDemo: false,
      lastPaymentMethod: null,
      settings: { theme: "light", notifications: true },
      linkedWallet: false,

      setSettings: (updates) => set((state) => ({ settings: { ...state.settings, ...updates } })),
      toggleWallet: () => set((state) => ({ linkedWallet: !state.linkedWallet })),
      
      addVehicle: (v) => set((state) => ({ vehicles: [...state.vehicles, v] })),
      updateVehicle: (id, v) => set((state) => ({ vehicles: state.vehicles.map(x => x.id === id ? { ...x, ...v } : x) })),
      deleteVehicle: (id) => set((state) => ({ vehicles: state.vehicles.filter(x => x.id !== id) })),
      setDefaultVehicle: (id) => set((state) => ({ 
        vehicles: state.vehicles.map(x => ({ ...x, isPrimary: x.id === id })) 
      })),
      reorderVehicles: (vehicles) => set({ vehicles }),

      aiMessages: [],
      addAiMessage: (msg) => set((state) => ({ aiMessages: [...state.aiMessages, msg] })),
      clearAiMessages: () => set({ aiMessages: [] }),

      setDemo: (val) => set({ isDemo: val }),
      login: () => set({ user: { name: "Nhat Nguyen", phone: "+84 987 654 321", isLoggedIn: true } }),
      logout: () => set({ user: null }),
      
      holdSpot: (lotId, spotId, vehicleId) => {
        const newBooking: Booking = {
          id: "EZ-" + Math.floor(Math.random() * 10000),
          lotId,
          spotId,
          vehicleId,
          status: "holding",
          holdExpiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes from now
          createdAt: Date.now(),
        };
        set({ activeBooking: newBooking });
      },

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
    }
  )
);

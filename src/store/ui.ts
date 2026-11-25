import { create } from 'zustand';

export interface ToastItem {
  id: number;
  msg: string;
}
interface UIState {
  toasts: ToastItem[];
  toast: (msg: string, ms?: number) => void;
  dismiss: (id: number) => void;
}
let n = 0;
export const useUI = create<UIState>((set, get) => ({
  toasts: [],
  toast: (msg, ms = 2600) => {
    const id = ++n;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, msg }] }));
    setTimeout(() => get().dismiss(id), ms);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
export const toast = (msg: string, ms?: number) => useUI.getState().toast(msg, ms);

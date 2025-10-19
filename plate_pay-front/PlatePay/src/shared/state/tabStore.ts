import { create } from "zustand";

type TabKey = "home" | "pay" | "history" | "car" | "wallet";
type TabState = {
  current: TabKey;
  hidden: boolean;
  badges: Partial<Record<TabKey, number>>;
  setTab: (key: TabKey) => void;
  show: () => void;
  hide: () => void;
  setBadge: (key: TabKey, n?: number) => void;
};

export const useTabStore = create<TabState>((set) => ({
  current: "home",
  hidden: false,
  badges: {},
  setTab: (key) => set({ current: key }),
  show: () => set({ hidden: false }),
  hide: () => set({ hidden: true }),
  setBadge: (key, n) =>
    set((s) => ({ badges: { ...s.badges, [key]: n ?? 0 } })),
}));

export type { TabKey };

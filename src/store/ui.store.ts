import { create } from 'zustand';

type UIState = {
  isQuizLocked: boolean;
  setQuizLocked: (locked: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  isQuizLocked: false,
  setQuizLocked: (locked) => set({ isQuizLocked: locked }),
}));

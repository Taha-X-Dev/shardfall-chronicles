"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GraphicsQuality = "low" | "medium" | "high" | "ultra";

export type Keybinds = Record<string, string>;

const normalizeActionName = (action: string) =>
  action.trim().toLowerCase().replace(/\s+/g, "_");

const normalizeKey = (key: string) => {
  const value = key.trim();
  if (!value) return "";
  if (value === " ") return "SPACE";
  return value.toUpperCase();
};

type GameSettingsState = {
  mouseSensitivity: number;
  graphicsQuality: GraphicsQuality;
  keybinds: Keybinds;
  setMouseSensitivity: (value: number) => void;
  setGraphicsQuality: (value: GraphicsQuality) => void;
  setKeybind: (action: string, key: string) => void;
  addKeybind: (action: string, key: string) => void;
  resetDefaults: () => void;
};

const defaultKeybinds: Keybinds = {
  forward: "W",
  back: "S",
  left: "A",
  right: "D",
  jump: "Space",
  skill: "Q",
};

const defaultState = {
  mouseSensitivity: 50,
  graphicsQuality: "high" as GraphicsQuality,
  keybinds: defaultKeybinds,
};

export const useGameSettingsStore = create<GameSettingsState>()(
  persist(
    (set) => ({
      ...defaultState,
      setMouseSensitivity: (value) =>
        set({ mouseSensitivity: Math.min(100, Math.max(1, value)) }),
      setGraphicsQuality: (value) => set({ graphicsQuality: value }),
      setKeybind: (action, key) =>
        set((state) => {
          const actionName = normalizeActionName(action);
          const mappedKey = normalizeKey(key);
          if (!actionName || !mappedKey) return state;

          return {
            keybinds: { ...state.keybinds, [actionName]: mappedKey },
          };
        }),
      addKeybind: (action, key) =>
        set((state) => {
          const actionName = normalizeActionName(action);
          const mappedKey = normalizeKey(key);
          if (!actionName || !mappedKey) return state;

          return {
            keybinds: { ...state.keybinds, [actionName]: mappedKey },
          };
        }),
      resetDefaults: () =>
        set({
          mouseSensitivity: defaultState.mouseSensitivity,
          graphicsQuality: defaultState.graphicsQuality,
          keybinds: defaultKeybinds,
        }),
    }),
    { name: "game-settings" },
  ),
);

import type { GraphicsQuality } from "@/store/game-settings";

export type LobbyTab = "single" | "multi" | "settings";

export type GamePhase = "lobby" | "loading" | "world";

export type LeaderboardPlayer = {
  id: number;
  name: string;
  level: number;
  experience: number;
};

export type BackendPlayer = {
  id: number;
  name: string;
  level?: number;
  health?: number;
  mana?: number;
  coins?: number;
};

export type BackendEnemy = {
  id: number;
  name: string;
  level?: number;
  health?: number;
  attack?: number;
};

export type PlayerSnapshot = {
  level: number;
  health: number;
  mana: number;
};

export type LevelAdvanceModal = {
  fromLevel: number;
  toLevel: number;
  gained: PlayerSnapshot;
  current: PlayerSnapshot;
};

export type TabOption = {
  id: LobbyTab;
  label: string;
};

export type GraphicsOption = GraphicsQuality;

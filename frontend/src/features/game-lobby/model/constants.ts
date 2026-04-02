import type { GraphicsOption, TabOption } from "./types";

export const tabs: TabOption[] = [
  { id: "single", label: "Single Player" },
  { id: "multi", label: "Multiplayer" },
  { id: "settings", label: "Settings" },
];

export const graphicsOptions: GraphicsOption[] = ["low", "medium", "high", "ultra"];

export const loadingHints = [
  "Binding sky shards to your world seed...",
  "Waking ancient boss runes...",
  "Sharpening your class loadout...",
  "Aligning realm portals and spawn points...",
];

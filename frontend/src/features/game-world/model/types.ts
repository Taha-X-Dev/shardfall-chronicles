import type { GraphicsQuality, Keybinds } from "@/store/game-settings";

export type SyncedPlayer = {
  id?: number;
  name?: string;
  level?: number;
  health?: number;
  mana?: number;
  coins?: number;
  experience?: number;
  healthOverride?: boolean;
};

export type WorldSceneProps = {
  graphicsQuality: GraphicsQuality;
  mouseSensitivity: number;
  activeAction: string | null;
  keybinds: Keybinds;
  apiBaseUrl: string;
  playerId: number;
  playerHealth: number;
  playerMaxHealth: number;
  selectedMapId: string;
  selectedEnemyIds: number[];
  interactive?: boolean;
  onPlayerSync?: (player: SyncedPlayer) => void;
  onCombatLog?: (text: string) => void;
  onEnemyCountChange?: (count: number) => void;
  onMapLevelChange?: (level: number) => void;
  onObjectiveChange?: (text: string) => void;
  onMapCompleted?: () => void;
  onPortalPrompt?: (payload: { fromLevel: number; toLevel: number }) => void;
  advanceToLevelToken?: number;
};

export type EnemyInstance = {
  instanceId: string;
  backendEnemyId: number;
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  currentHealth: number;
  attack: number;
  threat: number;
  x: number;
  z: number;
  phase: number;
  facing: number;
  behavior: "idle" | "chase" | "attack";
  attackUntil: number;
  spawnAt: number;
  hitUntil: number;
};

export type EnemyTemplate = {
  backendEnemyId: number;
  name: string;
  level: number;
  health: number;
  attack: number;
};

export type QualityPreset = {
  dpr: [number, number];
  starsCount: number;
  sparklesCount: number;
  bloomIntensity: number;
  shadowMapSize: number;
  enableShadows: boolean;
};

export type MapTheme = {
  id: string;
  skyColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  groundColor: string;
  grassColor: string;
  grassPatches: Array<[number, number, number]>;
  pathColor: string;
  pondColor: string;
  mountainColor: string;
  mountainPeakColor: string;
  mountainSpots: Array<[number, number, number]>;
  treeLeafColor: string;
  treeTrunkColor: string;
  treeSpots: Array<[number, number]>;
  pathPosition: [number, number, number];
  pathSize: [number, number];
  pondPosition: [number, number, number];
  portalPosition: [number, number, number];
  spawnScale: number;
  spawnOffset: [number, number];
  spawnSpread: number;
  enemyDensity: number;
  ambientLight: number;
  directionalLight: number;
  realmAccent: string;
  sectionGradient: string;
};

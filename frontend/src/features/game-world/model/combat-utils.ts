import type { EnemyInstance, EnemyTemplate, MapTheme } from "./types";

export const normalizeKey = (key: string) => {
  if (key === " ") return "SPACE";
  return key.toUpperCase();
};

export const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getEnemyMaxHealth = (level: number, baseHealth: number, attack: number) => {
  const normalizedLevel = Math.max(1, level);
  return Math.max(
    70,
    Math.round(baseHealth + normalizedLevel * 40 + Math.max(0, attack) * 3),
  );
};

const getEnemyThreat = (level: number, attack: number) =>
  Math.max(1, Math.round(level * 1.35 + attack * 0.55));

export const getAttackDamage = (enemy: EnemyInstance, attackType: "light" | "heavy") => {
  const baseDamage = attackType === "heavy" ? 52 : 34;
  const reduction = 1 + enemy.level * 0.12 + enemy.attack * 0.012;
  const variance = 0.9 + Math.random() * 0.24;
  return Math.max(4, Math.round((baseDamage * variance) / reduction));
};

export const getEnemyAttackDamage = (enemy: EnemyInstance, mapLevel: number) => {
  const levelMul = 1 + Math.max(0, mapLevel - 1) * 0.12;
  const baseDamage = (3 + enemy.level * 0.55 + enemy.attack * 0.12) * levelMul;
  const variance = 0.84 + Math.random() * 0.32;
  return Math.max(2, Math.round(baseDamage * variance));
};

export const getEnemyAttackCooldownMs = (enemy: EnemyInstance) => {
  const baseMs = 2150 - enemy.threat * 24;
  const variance = 0.9 + Math.random() * 0.22;
  return Math.max(700, Math.round(baseMs * variance));
};

export const getEnemyPalette = (level: number) => {
  if (level >= 12) {
    return {
      body: "#7f1d1d",
      emissive: "#ef4444",
      eye: "#fef2f2",
      horn: "#7c3aed",
      health: "#ef4444",
      aura: "#f97316",
    };
  }

  if (level >= 8) {
    return {
      body: "#581c87",
      emissive: "#a855f7",
      eye: "#e9d5ff",
      horn: "#9333ea",
      health: "#a855f7",
      aura: "#c084fc",
    };
  }

  if (level >= 5) {
    return {
      body: "#1d4ed8",
      emissive: "#38bdf8",
      eye: "#dbeafe",
      horn: "#0ea5e9",
      health: "#22d3ee",
      aura: "#67e8f9",
    };
  }

  return {
    body: "#14532d",
    emissive: "#22c55e",
    eye: "#dcfce7",
    horn: "#16a34a",
    health: "#4ade80",
    aura: "#34d399",
  };
};

const spawnPoints: Array<[number, number]> = [
  [5.4, -3.2],
  [6.6, -1.1],
  [5.2, 2.8],
  [2.7, 4.1],
  [-1.5, 4.8],
  [-4.4, 3.2],
  [-6.1, 0.9],
  [-5.8, -2.8],
  [-2.8, -4.8],
  [1.4, -5.1],
];

export const MAX_MAP_LEVEL = 5;

export const buildWaveEnemies = ({
  templates,
  mapTheme,
  mapLevel,
}: {
  templates: EnemyTemplate[];
  mapTheme: MapTheme;
  mapLevel: number;
}) => {
  const levelBoost = Math.max(0, mapLevel - 1);

  const spawnStartAt = Date.now();

  return templates.flatMap((template, rowIndex) => {
    const scaledLevel = template.level + levelBoost;
    const scaledAttack = Math.max(
      1,
      Math.round(template.attack * (1 + levelBoost * 0.18) + levelBoost * 2),
    );
    const scaledBaseHealth = Math.max(
      1,
      Math.round(template.health * (1 + levelBoost * 0.24) + levelBoost * 22),
    );
    const maxHealth = getEnemyMaxHealth(scaledLevel, scaledBaseHealth, scaledAttack);
    const extraByLevel = scaledLevel >= 10 ? 1 : 0;
    const count = Math.max(1, mapTheme.enemyDensity + levelBoost + extraByLevel);

    return Array.from({ length: count }, (_, cloneIndex) => {
      const spawnIndex = rowIndex * count + cloneIndex;
      const spot = spawnPoints[spawnIndex % spawnPoints.length];
      const lap = Math.floor(spawnIndex / spawnPoints.length);
      const jitter = (spawnIndex + 1) * 0.73;
      const jitterX = Math.sin(jitter) * 0.46;
      const jitterZ = Math.cos(jitter * 1.31) * 0.46;

      return {
        instanceId: `${template.backendEnemyId}-${mapLevel}-${rowIndex}-${cloneIndex}`,
        backendEnemyId: template.backendEnemyId,
        name: template.name,
        level: scaledLevel,
        health: scaledBaseHealth,
        maxHealth,
        currentHealth: maxHealth,
        attack: scaledAttack,
        threat: getEnemyThreat(scaledLevel, scaledAttack),
        x:
          spot[0] * mapTheme.spawnScale +
          mapTheme.spawnOffset[0] +
          lap * mapTheme.spawnSpread +
          jitterX,
        z:
          spot[1] * mapTheme.spawnScale +
          mapTheme.spawnOffset[1] +
          lap * mapTheme.spawnSpread +
          jitterZ,
        phase: (spawnIndex + cloneIndex + mapLevel) * 0.7,
        facing: Math.atan2(-spot[0], -spot[1]),
        behavior: "idle",
        attackUntil: 0,
        spawnAt:
          spawnStartAt +
          160 +
          rowIndex * 90 +
          cloneIndex * 55 +
          Math.floor(Math.random() * 140),
        hitUntil: 0,
      } satisfies EnemyInstance;
    });
  });
};

export const lerpAngle = (from: number, to: number, alpha: number) => {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * alpha;
};

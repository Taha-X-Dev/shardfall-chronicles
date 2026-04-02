import { type MutableRefObject, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import {
  clamp,
  getEnemyAttackCooldownMs,
  getEnemyAttackDamage,
} from "@/features/game-world/model/combat-utils";
import type { EnemyInstance } from "@/features/game-world/model/types";

type EnemyAttackControllerProps = {
  heroRef: MutableRefObject<THREE.Object3D | null>;
  enemies: EnemyInstance[];
  mapLevel: number;
  interactive: boolean;
  enabled: boolean;
  onEnemiesUpdate: (updater: (prev: EnemyInstance[]) => EnemyInstance[]) => void;
  onEnemyAttack: (enemy: EnemyInstance, damage: number) => void;
};

export function EnemyAttackController({
  heroRef,
  enemies,
  mapLevel,
  interactive,
  enabled,
  onEnemiesUpdate,
  onEnemyAttack,
}: EnemyAttackControllerProps) {
  const nextTickAtRef = useRef(0);
  const nextEnemyAttackAtRef = useRef(new Map<string, number>());

  useEffect(() => {
    const now = Date.now();
    const known = nextEnemyAttackAtRef.current;
    const ids = new Set<string>();

    enemies.forEach((enemy, index) => {
      ids.add(enemy.instanceId);
      if (known.has(enemy.instanceId)) return;

      const spreadDelay = 520 + (index % 4) * 120 + Math.random() * 220;
      known.set(enemy.instanceId, now + spreadDelay);
    });

    for (const enemyId of Array.from(known.keys())) {
      if (!ids.has(enemyId)) {
        known.delete(enemyId);
      }
    }
  }, [enemies]);

  useFrame(() => {
    if (!interactive || !enabled) return;
    const hero = heroRef.current;
    if (!hero) return;

    const now = Date.now();
    if (now < nextTickAtRef.current) return;
    nextTickAtRef.current = now + 95;

    const heroX = hero.position.x;
    const heroZ = hero.position.z;
    const chaseRange = 8.8;
    const followStopRange = 1.55;
    const attackRange = 2.15;
    const mapLimit = 10.5;
    const stepSeconds = 0.095;
    const hitEvents: Array<{ enemy: EnemyInstance; damage: number }> = [];
    let remainingHits = 2;

    onEnemiesUpdate((prev) => {
      let changed = false;
      const next: EnemyInstance[] = prev.map((enemy, index): EnemyInstance => {
        if (enemy.currentHealth <= 0) {
          if (enemy.behavior !== "idle" || enemy.attackUntil !== 0 || enemy.hitUntil !== 0) {
            changed = true;
            return {
              ...enemy,
              behavior: "idle" as const,
              attackUntil: 0,
              hitUntil: 0,
            };
          }
          return enemy;
        }

        if (!nextEnemyAttackAtRef.current.has(enemy.instanceId)) {
          const initialDelay = 420 + (index % 4) * 110 + Math.random() * 240;
          nextEnemyAttackAtRef.current.set(enemy.instanceId, now + initialDelay);
        }

        let nextX = enemy.x;
        let nextZ = enemy.z;
        let nextFacing = enemy.facing;
        let nextBehavior: EnemyInstance["behavior"] = enemy.behavior;
        let nextAttackUntil = enemy.attackUntil;

        const toHeroX = heroX - enemy.x;
        const toHeroZ = heroZ - enemy.z;
        const distance = Math.hypot(toHeroX, toHeroZ);
        const normalizedDist = Math.max(0.0001, distance);

        if (distance <= chaseRange) {
          nextFacing = Math.atan2(toHeroX, -toHeroZ);

          if (distance > followStopRange) {
            nextBehavior = "chase";
            const speed = clamp(1.1 + enemy.level * 0.028 + enemy.threat * 0.011, 1, 2.9);
            const step = Math.min(distance - followStopRange, speed * stepSeconds);
            nextX += (toHeroX / normalizedDist) * step;
            nextZ += (toHeroZ / normalizedDist) * step;
          } else {
            nextBehavior = "attack";
          }
        } else {
          nextBehavior = "idle";
        }

        nextX = clamp(nextX, -mapLimit, mapLimit);
        nextZ = clamp(nextZ, -mapLimit, mapLimit);

        const nextAttackAt = nextEnemyAttackAtRef.current.get(enemy.instanceId) ?? 0;
        if (distance <= attackRange && remainingHits > 0 && now >= nextAttackAt) {
          const damage = getEnemyAttackDamage(enemy, mapLevel);
          nextEnemyAttackAtRef.current.set(enemy.instanceId, now + getEnemyAttackCooldownMs(enemy));
          nextAttackUntil = now + 280;
          nextBehavior = "attack";
          hitEvents.push({
            enemy: {
              ...enemy,
              x: nextX,
              z: nextZ,
              facing: nextFacing,
              behavior: nextBehavior,
              attackUntil: nextAttackUntil,
            },
            damage,
          });
          remainingHits -= 1;
        }

        if (
          Math.abs(nextX - enemy.x) > 0.0005 ||
          Math.abs(nextZ - enemy.z) > 0.0005 ||
          Math.abs(nextFacing - enemy.facing) > 0.0005 ||
          nextBehavior !== enemy.behavior ||
          nextAttackUntil !== enemy.attackUntil
        ) {
          changed = true;
          return {
            ...enemy,
            x: nextX,
            z: nextZ,
            facing: nextFacing,
            behavior: nextBehavior,
            attackUntil: nextAttackUntil,
          };
        }

        return enemy;
      });

      return changed ? next : prev;
    });

    hitEvents.forEach(({ enemy, damage }) => {
      onEnemyAttack(enemy, damage);
    });
  });

  return null;
}

"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sparkles, Stars } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PCFShadowMap, Vector3 } from "three";
import type * as THREE from "three";
import { actionColors, mapThemes, qualityPresets } from "@/features/game-world/model/config";
import {
  MAX_MAP_LEVEL,
  buildWaveEnemies,
  clamp,
  getAttackDamage,
  toNumber,
} from "@/features/game-world/model/combat-utils";
import type {
  EnemyInstance,
  EnemyTemplate,
  SyncedPlayer,
  WorldSceneProps,
} from "@/features/game-world/model/types";
import { EnemyAttackController } from "@/features/game-world/ui/enemy-attack-controller";
import { EnemyModel } from "@/features/game-world/ui/enemy-model";
import { FirstPersonWeapon } from "@/features/game-world/ui/first-person-weapon";
import { LevelPortal } from "@/features/game-world/ui/level-portal";
import { ScenePostEffects } from "@/features/game-world/ui/scene-post-effects";
import { Terrain } from "@/features/game-world/ui/terrain";
import { Trees } from "@/features/game-world/ui/trees";
import { WorldController } from "@/features/game-world/ui/world-controller";

export function WorldScene({
  graphicsQuality,
  mouseSensitivity,
  activeAction,
  keybinds,
  apiBaseUrl,
  playerId,
  playerHealth,
  playerMaxHealth,
  selectedMapId,
  selectedEnemyIds,
  interactive = true,
  onPlayerSync,
  onCombatLog,
  onEnemyCountChange,
  onMapLevelChange,
  onObjectiveChange,
  onMapCompleted,
  onPortalPrompt,
  advanceToLevelToken = 0,
}: WorldSceneProps) {
  const mapTheme = mapThemes[selectedMapId] || mapThemes.weeping_wilds;
  const mapLabel = mapTheme.id.replace(/_/g, " ");
  const quality = qualityPresets[graphicsQuality];
  const actionColor = actionColors[activeAction || ""] || mapTheme.realmAccent;
  const actionBoost = activeAction ? 1 : 0;

  const heroRef = useRef<THREE.Object3D | null>(null);
  const movingRef = useRef(false);
  const attackTimerRef = useRef(0);
  const attackTypeRef = useRef<"light" | "heavy" | null>(null);
  const cameraShakeRef = useRef(0);
  const nextAttackAtRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const enemiesRef = useRef<EnemyInstance[]>([]);
  const finishingEnemyIdsRef = useRef(new Set<string>());
  const playerHealthRef = useRef(Math.max(0, playerHealth));
  const isPlayerDefeatedRef = useRef(Math.max(0, playerHealth) <= 0);
  const lastEnemyHitLogAtRef = useRef(0);

  const [mapLevel, setMapLevel] = useState(1);
  const [enemyTemplates, setEnemyTemplates] = useState<EnemyTemplate[]>([]);
  const [isAdvancingLevel, setIsAdvancingLevel] = useState(false);
  const [isInitialWaveReady, setIsInitialWaveReady] = useState(false);
  const [isMapCompleted, setIsMapCompleted] = useState(false);
  const [isPortalActive, setIsPortalActive] = useState(false);
  const [isAwaitingLevelConfirm, setIsAwaitingLevelConfirm] = useState(false);
  const [pendingNextLevel, setPendingNextLevel] = useState<number | null>(null);
  const [enemies, setEnemies] = useState<EnemyInstance[]>([]);
  const [targetedEnemyId, setTargetedEnemyId] = useState<string | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isPlayerDefeated, setIsPlayerDefeated] = useState(Math.max(0, playerHealth) <= 0);
  const [respawnToken, setRespawnToken] = useState(0);
  const lastAdvanceTokenRef = useRef(advanceToLevelToken);

  const targetedEnemy = useMemo(
    () => enemies.find((enemy) => enemy.instanceId === targetedEnemyId) || null,
    [enemies, targetedEnemyId],
  );

  useEffect(() => {
    enemiesRef.current = enemies;
    onEnemyCountChange?.(enemies.length);
  }, [enemies, onEnemyCountChange]);

  useEffect(() => {
    const normalizedHealth = Math.max(0, playerHealth);
    playerHealthRef.current = normalizedHealth;
    const defeated = normalizedHealth <= 0;
    isPlayerDefeatedRef.current = defeated;
    setIsPlayerDefeated(defeated);
  }, [playerHealth]);

  useEffect(() => {
    let ignore = false;

    const loadEnemies = async () => {
      setIsInitialWaveReady(false);
      setIsAdvancingLevel(false);
      setIsMapCompleted(false);
      setIsPortalActive(false);
      setIsAwaitingLevelConfirm(false);
      setPendingNextLevel(null);
      setMapLevel(1);
      setTargetedEnemyId(null);
      setEnemyTemplates([]);
      setEnemies([]);

      try {
        const res = await fetch(`${apiBaseUrl}/api/enemies`);
        if (!res.ok) {
          onCombatLog?.("Failed to load enemies from backend.");
          return;
        }

        const rows = (await res.json()) as Array<Record<string, unknown>>;
        const selectedEnemySet = new Set(selectedEnemyIds);
        const selectedRows: EnemyTemplate[] = rows
          .map((row, index) => {
            const level = Math.max(1, toNumber(row.level, 1));
            const attack = Math.max(1, toNumber(row.attack, 15));
            const baseHealth = Math.max(1, toNumber(row.health, 100));
            return {
              backendEnemyId: toNumber(row.id, -1),
              name: String(row.name ?? `enemy_${index + 1}`),
              level,
              health: baseHealth,
              attack,
            };
          })
          .filter(
            (enemy) =>
              enemy.backendEnemyId > 0 &&
              (selectedEnemySet.size === 0 || selectedEnemySet.has(enemy.backendEnemyId)),
          );
        const mapped = buildWaveEnemies({
          templates: selectedRows,
          mapTheme,
          mapLevel: 1,
        });

        if (!ignore) {
          setEnemyTemplates(selectedRows);
          setEnemies(mapped);
          setIsInitialWaveReady(true);
          if (mapped.length) {
            onCombatLog?.(
              `Level 1/${MAX_MAP_LEVEL} started on ${mapLabel}. ${mapped.length} enemies spawned.`,
            );
          } else {
            onCombatLog?.("No selected enemies found in backend for this map.");
          }
        }
      } catch {
        if (!ignore) {
          onCombatLog?.("Could not connect to backend enemies endpoint.");
        }
      }
    };

    void loadEnemies();

    return () => {
      ignore = true;
    };
  }, [apiBaseUrl, mapLabel, mapTheme, onCombatLog, selectedEnemyIds]);

  useEffect(() => {
    onMapLevelChange?.(mapLevel);
  }, [mapLevel, onMapLevelChange]);

  useEffect(() => {
    if (!isInitialWaveReady) {
      onObjectiveChange?.(`Preparing quest on ${mapLabel}...`);
      return;
    }

    if (isMapCompleted) {
      onObjectiveChange?.(`Quest Complete on ${mapLabel}. All ${MAX_MAP_LEVEL} levels cleared.`);
      return;
    }

    if (isPortalActive && pendingNextLevel != null) {
      onObjectiveChange?.(
        `Level ${mapLevel}/${MAX_MAP_LEVEL} cleared. Jump into portal to enter Level ${pendingNextLevel}.`,
      );
      return;
    }

    if (isAwaitingLevelConfirm && pendingNextLevel != null) {
      onObjectiveChange?.(
        `Portal entered. Review rewards and continue to Level ${pendingNextLevel}.`,
      );
      return;
    }

    if (isAdvancingLevel) {
      onObjectiveChange?.(`Entering Level ${pendingNextLevel ?? mapLevel + 1}...`);
      return;
    }

    onObjectiveChange?.(
      `Quest Level ${mapLevel}/${MAX_MAP_LEVEL}: Defeat all enemies (${enemies.length} remaining).`,
    );
  }, [
    enemies.length,
    isAdvancingLevel,
    isInitialWaveReady,
    isMapCompleted,
    isPortalActive,
    isAwaitingLevelConfirm,
    mapLabel,
    mapLevel,
    onObjectiveChange,
    pendingNextLevel,
  ]);

  useEffect(() => {
    if (!isInitialWaveReady || isAdvancingLevel || isMapCompleted) return;
    if (isPortalActive || isAwaitingLevelConfirm) return;
    if (enemyTemplates.length === 0) return;
    if (enemies.length > 0) return;

    if (mapLevel >= MAX_MAP_LEVEL) {
      setIsMapCompleted(true);
      onCombatLog?.(`Quest complete. ${mapLabel} conquered through all ${MAX_MAP_LEVEL} levels.`);
      onMapCompleted?.();
      return;
    }

    const nextLevel = mapLevel + 1;
    setPendingNextLevel(nextLevel);
    setIsPortalActive(true);
    onCombatLog?.(`Level ${mapLevel} complete. Jump into the portal to continue.`);
  }, [
    enemies.length,
    enemyTemplates,
    isAdvancingLevel,
    isInitialWaveReady,
    isMapCompleted,
    isPortalActive,
    isAwaitingLevelConfirm,
    mapLevel,
    onCombatLog,
    onMapCompleted,
  ]);

  useEffect(() => {
    const onPointerChange = () => {
      setIsPointerLocked(document.pointerLockElement === containerRef.current);
    };

    document.addEventListener("pointerlockchange", onPointerChange);
    return () => {
      document.removeEventListener("pointerlockchange", onPointerChange);
    };
  }, []);

  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      if (isPointerLocked) event.preventDefault();
    };

    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [isPointerLocked]);

  const requestPointerLock = () => {
    if (!interactive) return;
    if (isPlayerDefeatedRef.current) return;
    containerRef.current?.requestPointerLock();
  };

  const onPortalEntered = () => {
    if (!isPortalActive || pendingNextLevel == null) return;
    setIsPortalActive(false);
    setIsAwaitingLevelConfirm(true);
    setTargetedEnemyId(null);
    if (document.pointerLockElement === containerRef.current) {
      document.exitPointerLock();
    }
    onCombatLog?.(`Portal entered. Continue when ready for Level ${pendingNextLevel}.`);
    onPortalPrompt?.({ fromLevel: mapLevel, toLevel: pendingNextLevel });
  };

  const handleEnemyAttack = useCallback(
    (enemy: EnemyInstance, damage: number) => {
      if (!interactive || !isPointerLocked) return;
      if (isPlayerDefeatedRef.current) return;

      const currentHealth = Math.max(0, playerHealthRef.current);
      if (currentHealth <= 0) return;

      const nextHealth = Math.max(0, currentHealth - damage);
      playerHealthRef.current = nextHealth;
      setTargetedEnemyId(enemy.instanceId);
      onPlayerSync?.({ health: nextHealth });

      if (nextHealth <= 0) {
        isPlayerDefeatedRef.current = true;
        setIsPlayerDefeated(true);

        if (document.pointerLockElement === containerRef.current) {
          document.exitPointerLock();
        }

        onCombatLog?.(`${enemy.name} dealt the final blow. You were defeated.`);
        return;
      }

      const now = Date.now();
      if (now - lastEnemyHitLogAtRef.current >= 420) {
        lastEnemyHitLogAtRef.current = now;
        onCombatLog?.(`${enemy.name} hit you for ${damage}. HP ${nextHealth}.`);
      }
    },
    [interactive, isPointerLocked, onCombatLog, onPlayerSync],
  );

  const handleRetryLevel = useCallback(() => {
    if (enemyTemplates.length === 0) return;

    const restartHealth = Math.max(1, playerMaxHealth);
    const retryWave = buildWaveEnemies({
      templates: enemyTemplates,
      mapTheme,
      mapLevel,
    });

    setEnemies(retryWave);
    setTargetedEnemyId(null);
    setIsPlayerDefeated(false);
    setRespawnToken((prev) => prev + 1);
    finishingEnemyIdsRef.current.clear();
    playerHealthRef.current = restartHealth;
    isPlayerDefeatedRef.current = false;

    onPlayerSync?.({
      health: restartHealth,
      healthOverride: true,
    });
    onCombatLog?.(`You lost on Level ${mapLevel}. Restarting Level ${mapLevel}.`);
  }, [enemyTemplates, mapLevel, mapTheme, onCombatLog, onPlayerSync, playerMaxHealth]);

  const findTargetEnemy = (range: number) => {
    const hero = heroRef.current;
    if (!hero) return null;

    const forward = new Vector3(0, 0, -1).applyQuaternion(hero.quaternion);
    forward.y = 0;
    forward.normalize();

    let best: { enemy: EnemyInstance; dist: number } | null = null;

    for (const enemy of enemiesRef.current) {
      const toEnemy = new Vector3(enemy.x, 0, enemy.z).sub(
        new Vector3(hero.position.x, 0, hero.position.z),
      );
      const dist = toEnemy.length();
      if (dist > range) continue;

      const dir = toEnemy.normalize();
      const facing = dir.dot(forward);
      if (facing < 0.25) continue;

      if (!best || dist < best.dist) {
        best = { enemy, dist };
      }
    }

    return best?.enemy || null;
  };

  const runBattle = async (enemy: EnemyInstance, attackType: "light" | "heavy") => {
    try {
      const res = await fetch(`${apiBaseUrl}/game/players/${playerId}/battle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enemy_id: enemy.backendEnemyId }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const message = payload?.message || `Battle request failed (${res.status})`;
        onCombatLog?.(message);
        return;
      }

      const result = String(payload?.outcome?.result ?? "").toLowerCase();
      const exp = toNumber(payload?.outcome?.gainedExp, 0);

      if (payload?.player) {
        onPlayerSync?.(payload.player as SyncedPlayer);
      }

      if (result === "win") {
        setEnemies((prev) => prev.filter((item) => item.instanceId !== enemy.instanceId));
        onCombatLog?.(
          `${attackType === "heavy" ? "Heavy" : "Light"} finisher defeated ${enemy.name} (Lv ${enemy.level}). +${exp} XP`,
        );
      } else if (result === "loss") {
        setEnemies((prev) =>
          prev.map((item) =>
            item.instanceId === enemy.instanceId
              ? {
                  ...item,
                  currentHealth: Math.max(1, Math.round(item.maxHealth * 0.2)),
                }
              : item,
          ),
        );
        onCombatLog?.(`${enemy.name} resisted the finishing blow. Battle result: LOSS.`);
      } else {
        onCombatLog?.(`Battle completed vs ${enemy.name}.`);
      }
    } catch {
      setEnemies((prev) =>
        prev.map((item) =>
          item.instanceId === enemy.instanceId
            ? {
                ...item,
                currentHealth: Math.max(1, Math.round(item.maxHealth * 0.2)),
              }
            : item,
        ),
      );
      onCombatLog?.("Could not reach backend battle endpoint.");
    } finally {
      finishingEnemyIdsRef.current.delete(enemy.instanceId);
    }
  };

  useEffect(() => {
    if (advanceToLevelToken === lastAdvanceTokenRef.current) return;
    lastAdvanceTokenRef.current = advanceToLevelToken;
    if (!isAwaitingLevelConfirm || pendingNextLevel == null) return;

    setIsAdvancingLevel(true);
    setIsAwaitingLevelConfirm(false);
    onCombatLog?.(`Opening Level ${pendingNextLevel}...`);

    const timer = window.setTimeout(() => {
      const nextWave = buildWaveEnemies({
        templates: enemyTemplates,
        mapTheme,
        mapLevel: pendingNextLevel,
      });
      setMapLevel(pendingNextLevel);
      setTargetedEnemyId(null);
      setEnemies(nextWave);
      setPendingNextLevel(null);
      setIsAdvancingLevel(false);
      onCombatLog?.(
        `Level ${pendingNextLevel}/${MAX_MAP_LEVEL} started. ${nextWave.length} enemies spawned.`,
      );
    }, 620);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    advanceToLevelToken,
    enemyTemplates,
    isAwaitingLevelConfirm,
    mapTheme,
    onCombatLog,
    pendingNextLevel,
  ]);

  useEffect(() => {
    if (!interactive) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!isPointerLocked) return;
      if (isPlayerDefeatedRef.current) return;
      if (Date.now() < nextAttackAtRef.current) return;

      const attackType: "light" | "heavy" | null =
        event.button === 0 ? "light" : event.button === 2 ? "heavy" : null;
      if (!attackType) return;

      const range = attackType === "heavy" ? 3.2 : 2.5;
      const target = findTargetEnemy(range);

      attackTypeRef.current = attackType;
      attackTimerRef.current = attackType === "heavy" ? 0.34 : 0.22;
      nextAttackAtRef.current = Date.now() + (attackType === "heavy" ? 450 : 280);
      cameraShakeRef.current = attackType === "heavy" ? 1 : 0.7;

      if (!target) {
        onCombatLog?.(`${attackType === "heavy" ? "Heavy" : "Light"} swing missed.`);
        setTargetedEnemyId(null);
        return;
      }

      const damage = getAttackDamage(target, attackType);
      const nextHealth = Math.max(0, target.currentHealth - damage);
      setTargetedEnemyId(target.instanceId);

      if (nextHealth > 0) {
        const hitUntil = Date.now() + 210;
        setEnemies((prev) =>
          prev.map((item) =>
            item.instanceId === target.instanceId
              ? {
                  ...item,
                  currentHealth: nextHealth,
                  hitUntil,
                }
              : item,
          ),
        );
        onCombatLog?.(
          `${attackType === "heavy" ? "Heavy" : "Light"} hit on ${target.name} (Lv ${target.level}) for ${damage}. HP ${nextHealth}/${target.maxHealth}`,
        );
        return;
      }

      if (finishingEnemyIdsRef.current.has(target.instanceId)) return;

      finishingEnemyIdsRef.current.add(target.instanceId);
      const finisherHitUntil = Date.now() + 260;
      setEnemies((prev) =>
        prev.map((item) =>
          item.instanceId === target.instanceId
            ? {
                ...item,
                currentHealth: 0,
                hitUntil: finisherHitUntil,
              }
            : item,
        ),
      );
      onCombatLog?.(
        `${attackType === "heavy" ? "Heavy" : "Light"} finisher on ${target.name} (Lv ${target.level}). Syncing with backend...`,
      );
      void runBattle(target, attackType);
    };

    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [interactive, isPointerLocked]);

  return (
    <section
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background: mapTheme.sectionGradient }}
      onClick={requestPointerLock}
    >
      <Canvas
        dpr={quality.dpr}
        shadows={quality.enableShadows ? { type: PCFShadowMap } : false}
        gl={{ antialias: true, powerPreference: "high-performance", precision: "mediump" }}
        camera={{ position: [0, 1.65, 5], fov: 77 }}
      >
        <color attach="background" args={[mapTheme.skyColor]} />
        <fog attach="fog" args={[mapTheme.fogColor, mapTheme.fogNear, mapTheme.fogFar]} />

        <ambientLight intensity={mapTheme.ambientLight} />
        <directionalLight
          position={[6, 10, 2]}
          intensity={mapTheme.directionalLight}
          castShadow={quality.enableShadows}
          shadow-mapSize-width={quality.shadowMapSize}
          shadow-mapSize-height={quality.shadowMapSize}
        />
        <pointLight
          position={[2.4, 2, -2.6]}
          color={actionColor}
          intensity={16 + actionBoost * 5}
          distance={10}
        />

        <Stars radius={130} depth={45} count={quality.starsCount} factor={4} saturation={0} fade />
        <Sparkles
          count={quality.sparklesCount}
          scale={[14, 6, 14]}
          speed={0.35 + actionBoost * 0.3}
          size={1.6 + actionBoost * 0.5}
          color={actionColor}
        />

        <Terrain mapTheme={mapTheme} />
        <Trees mapTheme={mapTheme} />
        <LevelPortal
          active={isPortalActive}
          position={mapTheme.portalPosition}
          color={mapTheme.realmAccent}
          heroRef={heroRef}
          onEnter={onPortalEntered}
        />

        <group ref={heroRef} position={[0, 0, 5]} />

        {enemies.map((enemy) => (
          <EnemyModel
            key={enemy.instanceId}
            enemy={enemy}
            highlighted={targetedEnemyId === enemy.instanceId}
          />
        ))}

        <WorldController
          heroRef={heroRef}
          movingRef={movingRef}
          keybinds={keybinds}
          interactive={interactive && !isPlayerDefeated}
          respawnToken={respawnToken}
          mouseSensitivity={mouseSensitivity}
          attackTimerRef={attackTimerRef}
          attackTypeRef={attackTypeRef}
          cameraShakeRef={cameraShakeRef}
        />

        <EnemyAttackController
          heroRef={heroRef}
          enemies={enemies}
          mapLevel={mapLevel}
          interactive={interactive}
          enabled={
            isPointerLocked &&
            !isPlayerDefeated &&
            !isAdvancingLevel &&
            !isPortalActive &&
            !isAwaitingLevelConfirm &&
            !isMapCompleted
          }
          onEnemiesUpdate={setEnemies}
          onEnemyAttack={handleEnemyAttack}
        />

        <FirstPersonWeapon
          cameraShakeRef={cameraShakeRef}
          movingRef={movingRef}
          attackTimerRef={attackTimerRef}
          attackTypeRef={attackTypeRef}
        />

        {!interactive ? (
          <OrbitControls
            enablePan={false}
            minDistance={7}
            maxDistance={14}
            minPolarAngle={0.6}
            maxPolarAngle={1.45}
            rotateSpeed={0.9}
            zoomSpeed={0.45}
            target={[0, 0.9, 0]}
          />
        ) : null}

        <ScenePostEffects intensity={quality.bloomIntensity + actionBoost * 0.2} />
      </Canvas>

      {interactive && !isPointerLocked ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl border border-cyan-300/35 bg-slate-950/85 px-4 py-2 text-xs font-semibold text-cyan-200">
            Click to lock mouse and play in first person
          </div>
        </div>
      ) : null}

      {interactive && isPlayerDefeated ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-rose-300/35 bg-slate-950/92 p-5 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-300">You Lose</p>
            <p className="mt-1 text-xl font-black text-zinc-100">Defeated On Level {mapLevel}</p>
            <p className="mt-2 text-sm text-zinc-300">Your run will restart from this same level.</p>
            <button
              type="button"
              onClick={handleRetryLevel}
              className="mt-4 rounded-xl bg-cyan-300 px-5 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
            >
              Try Again (Level {mapLevel})
            </button>
          </div>
        </div>
      ) : null}

      {interactive && targetedEnemy ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 w-[min(360px,92vw)] -translate-x-1/2 rounded-xl border border-rose-300/35 bg-slate-950/80 p-3 backdrop-blur">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-rose-200">
              {targetedEnemy.name} (Lv {targetedEnemy.level})
            </span>
            <span className="text-zinc-200">
              {targetedEnemy.currentHealth}/{targetedEnemy.maxHealth}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-600 to-orange-400 transition-all duration-150"
              style={{
                width: `${Math.round(
                  clamp(
                    (targetedEnemy.currentHealth / Math.max(1, targetedEnemy.maxHealth)) * 100,
                    0,
                    100,
                  ),
                )}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {interactive && isAdvancingLevel ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-2xl border border-cyan-300/35 bg-slate-950/85 px-5 py-3 text-center backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Quest Progress</p>
            <p className="mt-1 text-lg font-black text-zinc-100">
              Level {mapLevel + 1}/{MAX_MAP_LEVEL} Incoming
            </p>
          </div>
        </div>
      ) : null}

      {interactive && isPortalActive && pendingNextLevel != null ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center">
          <div className="rounded-xl border border-cyan-300/35 bg-slate-950/85 px-4 py-2 text-xs font-semibold text-cyan-200 backdrop-blur">
            Level {mapLevel} cleared. Jump into portal to enter Level {pendingNextLevel}.
          </div>
        </div>
      ) : null}

      {interactive && isMapCompleted ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-2xl border border-emerald-300/35 bg-slate-950/88 px-6 py-4 text-center backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Quest Complete</p>
            <p className="mt-1 text-lg font-black text-zinc-100">
              {mapLabel} Cleared ({MAX_MAP_LEVEL}/{MAX_MAP_LEVEL})
            </p>
            <p className="mt-1 text-xs text-zinc-300">
              Return to lobby to select a new map and enemy set.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { bosses, classes, gameIntro, gameName, worldMaps } from "@/lib/game/lore";
import { LobbyScene } from "@/components/game/lobby-scene";
import { WorldScene } from "@/components/game/world-scene";
import { useGameSettingsStore } from "@/store/game-settings";
import { graphicsOptions, loadingHints, tabs } from "@/features/game-lobby/model/constants";
import type {
  BackendEnemy,
  BackendPlayer,
  GamePhase,
  LeaderboardPlayer,
  LevelAdvanceModal,
  LobbyTab,
  PlayerSnapshot,
} from "@/features/game-lobby/model/types";
import {
  toDisplayAction,
  toNumberOrUndefined,
  toPercent,
} from "@/features/game-lobby/model/utils";
import { DeployOverlay } from "@/features/game-lobby/ui/deploy-overlay";
import { LevelAdvanceModal as LevelAdvanceModalDialog } from "@/features/game-lobby/ui/level-advance-modal";
import { LoadingWorldScreen } from "@/features/game-lobby/ui/loading-world-screen";
import { PlayerSelectionModal } from "@/features/game-lobby/ui/player-selection-modal";

export function GameLobby() {
  const [activeTab, setActiveTab] = useState<LobbyTab>("single");
  const [gamePhase, setGamePhase] = useState<GamePhase>("lobby");
  const [hasContinuedToGame, setHasContinuedToGame] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);

  const [backendStatus, setBackendStatus] = useState("Checking backend...");
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [selectedClass, setSelectedClass] = useState(classes[0].id);
  const [selectedMapId, setSelectedMapId] = useState(worldMaps[0].id);
  const [enemyPool, setEnemyPool] = useState<BackendEnemy[]>([]);
  const [enemyPoolLoading, setEnemyPoolLoading] = useState(false);
  const [enemyPoolError, setEnemyPoolError] = useState<string | null>(null);
  const [selectedEnemyIds, setSelectedEnemyIds] = useState<number[]>([]);

  const [activePlayer, setActivePlayer] = useState<BackendPlayer | null>(null);
  const [players, setPlayers] = useState<BackendPlayer[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [pendingPlayerId, setPendingPlayerId] = useState<number | null>(null);

  const [newActionName, setNewActionName] = useState("");
  const [newActionKey, setNewActionKey] = useState("");
  const [lastTriggeredAction, setLastTriggeredAction] = useState<string | null>(null);
  const [worldCombatLog, setWorldCombatLog] = useState("Click Continue, then click to lock mouse.");
  const [worldEnemyCount, setWorldEnemyCount] = useState(0);
  const [worldMapLevel, setWorldMapLevel] = useState(1);
  const [worldObjective, setWorldObjective] = useState("Prepare quest...");
  const [isQuestComplete, setIsQuestComplete] = useState(false);
  const [levelAdvanceToken, setLevelAdvanceToken] = useState(0);
  const [levelStartSnapshot, setLevelStartSnapshot] = useState<PlayerSnapshot>({
    level: 1,
    health: 0,
    mana: 0,
  });
  const [levelAdvanceModal, setLevelAdvanceModal] = useState<LevelAdvanceModal | null>(null);

  const {
    mouseSensitivity,
    graphicsQuality,
    keybinds,
    setMouseSensitivity,
    setGraphicsQuality,
    setKeybind,
    addKeybind,
    resetDefaults,
  } = useGameSettingsStore();

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
    [],
  );

  const keybindEntries = useMemo(
    () => Object.entries(keybinds) as Array<[string, string]>,
    [keybinds],
  );

  const selectedClassMeta = useMemo(
    () => classes.find((item) => item.id === selectedClass) || classes[0],
    [selectedClass],
  );

  const selectedMapMeta = useMemo(
    () => worldMaps.find((item) => item.id === selectedMapId) || worldMaps[0],
    [selectedMapId],
  );

  const pendingPlayer = useMemo(
    () => players.find((item) => item.id === pendingPlayerId) || null,
    [players, pendingPlayerId],
  );

  const selectedEnemies = useMemo(
    () => enemyPool.filter((enemy) => selectedEnemyIds.includes(enemy.id)),
    [enemyPool, selectedEnemyIds],
  );

  const selectedEnemyPreview = useMemo(
    () => selectedEnemies.slice(0, 3).map((enemy) => enemy.name).join(", "),
    [selectedEnemies],
  );

  const getPlayerSnapshot = useCallback((player: BackendPlayer | null): PlayerSnapshot => {
    const level = Math.max(1, player?.level ?? 1);
    const estimatedHealth = 120 + level * 42;
    const estimatedMana = 80 + level * 30;
    return {
      level,
      health: Math.max(0, player?.health ?? estimatedHealth),
      mana: Math.max(0, player?.mana ?? estimatedMana),
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadLobbyData = async () => {
      setEnemyPoolLoading(true);
      setEnemyPoolError(null);

      const [healthResult, boardResult, enemyResult] = await Promise.allSettled([
        fetch(`${apiBaseUrl}/health`, { signal: controller.signal }),
        fetch(`${apiBaseUrl}/api/leaderboard?limit=5`, { signal: controller.signal }),
        fetch(`${apiBaseUrl}/api/enemies`, { signal: controller.signal }),
      ]);

      if (healthResult.status === "fulfilled") {
        setBackendStatus(healthResult.value.ok ? "Backend online" : "Backend unreachable");
      } else {
        setBackendStatus("Backend unreachable");
      }

      if (boardResult.status === "fulfilled" && boardResult.value.ok) {
        const boardData = await boardResult.value.json();
        setLeaderboard(boardData.players ?? []);
      }

      if (enemyResult.status === "fulfilled" && enemyResult.value.ok) {
        const raw = (await enemyResult.value.json()) as Array<Record<string, unknown>>;
        const normalized: BackendEnemy[] = raw
          .map((item) => ({
            id: toNumberOrUndefined(item.id) ?? -1,
            name: String(item.name ?? "").trim() || "Unknown Enemy",
            level: toNumberOrUndefined(item.level),
            health: toNumberOrUndefined(item.health),
            attack: toNumberOrUndefined(item.attack),
          }))
          .filter((item) => item.id > 0);

        setEnemyPool(normalized);
        setSelectedEnemyIds((prev) => {
          const validPrev = prev.filter((id) => normalized.some((enemy) => enemy.id === id));
          return validPrev.length ? validPrev : normalized.map((enemy) => enemy.id);
        });
        if (!normalized.length) {
          setEnemyPoolError("No enemies found in backend.");
        }
      } else {
        setEnemyPoolError("Could not load enemies from backend.");
      }

      setEnemyPoolLoading(false);
    };

    void loadLobbyData();

    return () => {
      controller.abort();
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    if (gamePhase !== "loading") return;

    let progress = 0;
    let finishTimer: number | null = null;

    const interval = window.setInterval(() => {
      progress = Math.min(100, progress + Math.floor(Math.random() * 16) + 8);
      setLoadingProgress(progress);
      setLoadingHintIndex((prev) => (prev + 1) % loadingHints.length);

      if (progress >= 100) {
        window.clearInterval(interval);
        finishTimer = window.setTimeout(() => {
          setGamePhase("world");
        }, 420);
      }
    }, 260);

    return () => {
      window.clearInterval(interval);
      if (finishTimer) window.clearTimeout(finishTimer);
    };
  }, [gamePhase]);

  useEffect(() => {
    const normalizePressedKey = (key: string) => {
      if (key === " ") return "SPACE";
      return key.toUpperCase();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const pressed = normalizePressedKey(event.key);
      const matched = keybindEntries.find(([, boundKey]) => boundKey === pressed);
      if (!matched) return;

      const [action] = matched;
      setLastTriggeredAction(action);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [keybindEntries]);

  useEffect(() => {
    if (!lastTriggeredAction) return;
    const timer = window.setTimeout(() => setLastTriggeredAction(null), 900);
    return () => window.clearTimeout(timer);
  }, [lastTriggeredAction]);

  const loadPlayersFromBackend = async () => {
    setPlayersLoading(true);
    setPlayersError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/players`);
      if (!response.ok) {
        setPlayersError("Could not load players from backend.");
        return;
      }

      const raw = (await response.json()) as Array<Record<string, unknown>>;
      const normalized: BackendPlayer[] = raw
        .map((item) => ({
          id: toNumberOrUndefined(item.id) ?? -1,
          name: String(item.name ?? "").trim() || "Unknown",
          level: toNumberOrUndefined(item.level),
          health: toNumberOrUndefined(item.health),
          mana: toNumberOrUndefined(item.mana),
          coins: toNumberOrUndefined(item.coins),
        }))
        .filter((item) => item.id > 0);

      setPlayers(normalized);
      if (!normalized.length) {
        setPlayersError("No players found in database.");
      }

      const defaultSelection = activePlayer?.id ?? normalized[0]?.id ?? null;
      setPendingPlayerId(defaultSelection);
    } catch {
      setPlayersError("Could not connect to backend.");
    } finally {
      setPlayersLoading(false);
    }
  };

  const openPlayerModal = () => {
    if (!canStartAdventure) return;
    setIsPlayerModalOpen(true);
    void loadPlayersFromBackend();
  };

  const startWorldTransition = (initialPlayer: BackendPlayer | null) => {
    setLoadingProgress(0);
    setLoadingHintIndex(0);
    setHasContinuedToGame(false);
    setWorldCombatLog("Synchronizing world with backend...");
    setWorldEnemyCount(0);
    setWorldMapLevel(1);
    setIsQuestComplete(false);
    setLevelAdvanceModal(null);
    setLevelAdvanceToken(0);
    setLevelStartSnapshot(getPlayerSnapshot(initialPlayer));
    setWorldObjective(`Quest Level 1/5: Defeat all enemies in ${selectedMapMeta.name}.`);
    setGamePhase("loading");
  };

  const confirmPlayerSelection = () => {
    if (!selectedEnemyIds.length) return;
    if (!pendingPlayerId) return;
    const pickedPlayer = players.find((item) => item.id === pendingPlayerId);
    if (!pickedPlayer) return;

    setActivePlayer(pickedPlayer);
    setIsPlayerModalOpen(false);
    startWorldTransition(pickedPlayer);
  };

  const addCustomKeybind = () => {
    const action = newActionName.trim();
    const key = newActionKey.trim();
    if (!action || !key) return;

    addKeybind(action, key);
    setNewActionName("");
    setNewActionKey("");
  };

  const toggleEnemySelection = (enemyId: number) => {
    setSelectedEnemyIds((prev) =>
      prev.includes(enemyId)
        ? prev.filter((id) => id !== enemyId)
        : [...prev, enemyId],
    );
  };

  const selectAllEnemies = () => {
    setSelectedEnemyIds(enemyPool.map((enemy) => enemy.id));
  };

  const clearEnemySelection = () => {
    setSelectedEnemyIds([]);
  };

  const canStartAdventure = selectedEnemyIds.length > 0 && enemyPool.length > 0 && !enemyPoolLoading;
  const handleMapCompleted = useCallback(() => {
    setIsQuestComplete(true);
    setLevelAdvanceModal(null);
  }, []);

  const handlePortalPrompt = useCallback(
    ({ fromLevel, toLevel }: { fromLevel: number; toLevel: number }) => {
      const current = getPlayerSnapshot(activePlayer);
      const gained: PlayerSnapshot = {
        level: current.level - levelStartSnapshot.level,
        health: current.health - levelStartSnapshot.health,
        mana: current.mana - levelStartSnapshot.mana,
      };

      setLevelAdvanceModal({
        fromLevel,
        toLevel,
        gained,
        current,
      });
      setWorldCombatLog(`Level ${fromLevel} clear. Review rewards and continue to Level ${toLevel}.`);
    },
    [activePlayer, getPlayerSnapshot, levelStartSnapshot],
  );

  const handleMapLevelChange = useCallback(
    (level: number) => {
      setWorldMapLevel(level);
      setLevelStartSnapshot(getPlayerSnapshot(activePlayer));
    },
    [activePlayer, getPlayerSnapshot],
  );

  const handleContinueToNextLevel = useCallback(() => {
    setLevelAdvanceToken((prev) => prev + 1);
    setLevelAdvanceModal(null);
    setLevelStartSnapshot(getPlayerSnapshot(activePlayer));
    setWorldCombatLog("Continuing to next level...");
  }, [activePlayer, getPlayerSnapshot]);

  if (gamePhase === "loading" && activePlayer) {
    return (
      <LoadingWorldScreen
        activePlayer={activePlayer}
        selectedClassName={selectedClassMeta.name}
        selectedMapName={selectedMapMeta.name}
        selectedEnemyCount={selectedEnemyIds.length}
        loadingProgress={loadingProgress}
        loadingHint={loadingHints[loadingHintIndex]}
      />
    );
  }

  if (gamePhase === "world" && activePlayer) {
    const playerLevel = Math.max(1, activePlayer.level ?? 1);
    const estimatedMaxHealth = 120 + playerLevel * 42;
    const estimatedMaxMana = 80 + playerLevel * 30;
    const playerHealth = Math.max(0, activePlayer.health ?? estimatedMaxHealth);
    const playerMana = Math.max(0, activePlayer.mana ?? estimatedMaxMana);
    const playerHealthMax = Math.max(estimatedMaxHealth, playerHealth);
    const playerManaMax = Math.max(estimatedMaxMana, playerMana);
    const hpPercent = toPercent(playerHealth, playerHealthMax);
    const manaPercent = toPercent(playerMana, playerManaMax);

    return (
      <main className="relative h-screen w-screen overflow-hidden bg-black text-zinc-100">
        <WorldScene
          graphicsQuality={graphicsQuality}
          mouseSensitivity={mouseSensitivity}
          activeAction={lastTriggeredAction}
          keybinds={keybinds}
          apiBaseUrl={apiBaseUrl}
          playerId={activePlayer.id}
          playerHealth={playerHealth}
          playerMaxHealth={playerHealthMax}
          selectedMapId={selectedMapId}
          selectedEnemyIds={selectedEnemyIds}
          advanceToLevelToken={levelAdvanceToken}
          interactive={hasContinuedToGame}
          onEnemyCountChange={setWorldEnemyCount}
          onCombatLog={setWorldCombatLog}
          onMapLevelChange={handleMapLevelChange}
          onObjectiveChange={setWorldObjective}
          onMapCompleted={handleMapCompleted}
          onPortalPrompt={handlePortalPrompt}
          onPlayerSync={(player) =>
            setActivePlayer((prev) =>
              prev
                ? {
                    ...prev,
                    name: player.name ?? prev.name,
                    level: player.level ?? prev.level,
                    health:
                      player.health != null
                        ? player.healthOverride
                          ? player.health
                          : prev.health != null
                            ? Math.min(prev.health, player.health)
                            : player.health
                        : prev.health,
                    mana: player.mana ?? prev.mana,
                    coins: player.coins ?? prev.coins,
                  }
                : prev,
            )
          }
        />

        {hasContinuedToGame ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full border border-cyan-300 bg-cyan-300/35 shadow-[0_0_16px_2px_rgba(34,211,238,0.65)]" />
          </div>
        ) : null}

        <div className="absolute left-4 right-4 top-4 z-20 flex flex-wrap items-start justify-between gap-3">
          <div className="rounded-xl border border-cyan-300/35 bg-slate-950/75 px-4 py-2 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">World Session</p>
            <p className="text-lg font-black">{gameName}</p>
            <p className="text-xs text-zinc-300">
              {activePlayer.name} (Lv {activePlayer.level ?? 1}) | Class: {selectedClassMeta.name}
            </p>
            <p className="text-xs text-zinc-300">Map: {selectedMapMeta.name}</p>

            <div className="mt-2 space-y-2">
              <div>
                <div className="flex items-center justify-between text-[11px] text-zinc-200">
                  <span>HP</span>
                  <span>
                    {playerHealth}/{playerHealthMax}
                  </span>
                </div>
                <div className="mt-1 h-2 w-44 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-600 to-red-400 transition-all duration-200"
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-zinc-200">
                  <span>Mana</span>
                  <span>
                    {playerMana}/{playerManaMax}
                  </span>
                </div>
                <div className="mt-1 h-2 w-44 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-200"
                    style={{ width: `${manaPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-cyan-300/35 bg-slate-950/70 px-3 py-1">
              Level: {worldMapLevel}/5
            </span>
            <span className="rounded-full border border-amber-300/35 bg-slate-950/70 px-3 py-1">
              Enemies: {worldEnemyCount}
            </span>
            <span className="rounded-full border border-emerald-300/35 bg-slate-950/70 px-3 py-1">
              {hasContinuedToGame ? "In Game" : "Preview"}
            </span>
            <span
              className={`rounded-full border px-3 py-1 ${
                isQuestComplete
                  ? "border-emerald-300/45 bg-emerald-900/25 text-emerald-200"
                  : "border-zinc-400/35 bg-slate-950/70 text-zinc-200"
              }`}
            >
              {isQuestComplete ? "Quest Complete" : "Quest Active"}
            </span>
            <button
              type="button"
              onClick={() => {
                setHasContinuedToGame(false);
                setGamePhase("lobby");
              }}
              className="rounded-full border border-zinc-500 bg-slate-950/70 px-3 py-1 font-semibold transition hover:border-zinc-300"
            >
              Return To Lobby
            </button>
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 z-20 w-[min(960px,95vw)] -translate-x-1/2 rounded-2xl border border-cyan-300/25 bg-slate-950/75 p-3 backdrop-blur">
          <div className="grid gap-2 text-xs md:grid-cols-3">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-2">
              <p className="uppercase tracking-wide text-cyan-300">Objective</p>
              <p className="mt-1 text-zinc-200">
                {worldObjective || selectedMapMeta.objective}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-2">
              <p className="uppercase tracking-wide text-cyan-300">Controls</p>
              <p className="mt-1 text-zinc-200">
                {keybinds.forward || "W"}/{keybinds.back || "S"}/{keybinds.left || "A"}/{keybinds.right || "D"} move
              </p>
              <p className="text-zinc-200">Space jump | Left click light | Right click heavy</p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-2">
              <p className="uppercase tracking-wide text-cyan-300">Combat Log</p>
              <p className="mt-1 text-zinc-200">{worldCombatLog}</p>
            </div>
          </div>
        </div>

        {!hasContinuedToGame ? (
          <DeployOverlay
            selectedMapName={selectedMapMeta.name}
            selectedEnemyCount={selectedEnemyIds.length}
            onContinue={() => {
              setHasContinuedToGame(true);
              setWorldCombatLog("Click once in scene to lock mouse. Hunt enemies.");
            }}
          />
        ) : null}

        <LevelAdvanceModalDialog
          levelAdvanceModal={levelAdvanceModal}
          onContinue={handleContinueToNextLevel}
        />
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen w-full bg-[radial-gradient(circle_at_15%_20%,#0f172a,transparent_45%),radial-gradient(circle_at_85%_10%,#082f49,transparent_40%),linear-gradient(180deg,#020617,#020617)] px-4 py-6 text-zinc-100 md:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
          <section className="h-fit space-y-4 rounded-3xl border border-cyan-200/20 bg-black/35 p-5 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-cyan-300/90">RPG LOBBY</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">{gameName}</h1>
              </div>
              <span className="rounded-full border border-cyan-300/30 px-3 py-1 text-xs font-semibold">
                {backendStatus}
              </span>
            </div>
            <p className="text-sm text-zinc-300 md:text-base">{gameIntro}</p>
            <LobbyScene
              mouseSensitivity={mouseSensitivity}
              graphicsQuality={graphicsQuality}
              activeAction={lastTriggeredAction}
            />
          </section>

          <aside className="h-fit rounded-3xl border border-cyan-200/20 bg-slate-950/70 p-4 shadow-2xl">
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-cyan-950/40 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-2 py-2 text-xs font-semibold transition md:text-sm ${
                    activeTab === tab.id
                      ? "bg-cyan-300 text-slate-950"
                      : "text-cyan-100 hover:bg-cyan-900/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "single" ? (
              <div className="mt-4 space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Choose Your Class</h2>
                  <div className="mt-2 grid gap-2">
                    {classes.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedClass(item.id)}
                        className={`rounded-xl border p-3 text-left transition ${
                          selectedClass === item.id
                            ? "border-cyan-300 bg-cyan-500/20"
                            : "border-zinc-700 hover:border-zinc-500"
                        }`}
                      >
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-zinc-300">{item.style}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold">Choose Map</h3>
                  <div className="mt-2 grid gap-2">
                    {worldMaps.map((map) => (
                      <button
                        key={map.id}
                        type="button"
                        onClick={() => setSelectedMapId(map.id)}
                        className={`rounded-xl border p-3 text-left transition ${
                          selectedMapId === map.id
                            ? "border-cyan-300 bg-cyan-500/20"
                            : "border-zinc-700 hover:border-zinc-500"
                        }`}
                      >
                        <p className="text-sm font-semibold">{map.name}</p>
                        <p className="text-xs text-zinc-300">{map.vibe}</p>
                        <p className="mt-1 text-xs text-cyan-300">{map.challenge}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-700 bg-zinc-900/55 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">Enemy Spawn Selection</h3>
                    <span className="text-xs text-cyan-300">
                      {selectedEnemyIds.length} selected
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAllEnemies}
                      disabled={!enemyPool.length}
                      className="rounded-lg border border-cyan-300/40 px-2 py-1 text-xs font-semibold text-cyan-200 disabled:opacity-50"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearEnemySelection}
                      disabled={!enemyPool.length}
                      className="rounded-lg border border-zinc-600 px-2 py-1 text-xs font-semibold text-zinc-200 disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>

                  {enemyPoolLoading ? (
                    <p className="mt-3 text-xs text-zinc-300">Loading backend enemies...</p>
                  ) : null}

                  {enemyPoolError && !enemyPoolLoading ? (
                    <p className="mt-3 text-xs text-rose-300">{enemyPoolError}</p>
                  ) : null}

                  {!enemyPoolLoading && !enemyPoolError ? (
                    <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                      {enemyPool.map((enemy) => {
                        const selected = selectedEnemyIds.includes(enemy.id);
                        return (
                          <button
                            key={enemy.id}
                            type="button"
                            onClick={() => toggleEnemySelection(enemy.id)}
                            className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                              selected
                                ? "border-cyan-300 bg-cyan-500/20"
                                : "border-zinc-700 bg-zinc-950/60 hover:border-zinc-500"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{enemy.name}</span>
                              <span className="text-cyan-300">Lv {enemy.level ?? "-"}</span>
                            </div>
                            <p className="mt-1 text-zinc-300">
                              HP {enemy.health ?? "-"} • ATK {enemy.attack ?? "-"}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-base font-bold">Boss Roadmap</h3>
                  <div className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
                    {bosses.map((boss) => (
                      <div key={boss.id} className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-3">
                        <p className="text-sm font-semibold">
                          {boss.id}. {boss.name}
                        </p>
                        <p className="text-xs text-cyan-300">{boss.title}</p>
                        <p className="mt-1 text-xs text-zinc-300">Realm: {boss.realm}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-300/30 bg-cyan-950/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-cyan-300">Active Player</p>
                  <p className="mt-1 text-sm font-semibold">
                    {activePlayer ? activePlayer.name : "Not selected"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-300">
                    {activePlayer
                      ? `Level ${activePlayer.level ?? "-"} • Health ${activePlayer.health ?? "-"} • Mana ${activePlayer.mana ?? "-"}`
                      : "Click Start Adventure to choose from backend players."}
                  </p>
                  <p className="mt-1 text-xs text-zinc-300">
                    Map: {selectedMapMeta.name} • Enemy pool: {selectedEnemyIds.length}
                  </p>
                  {selectedEnemyPreview ? (
                    <p className="mt-1 text-xs text-zinc-400">
                      Enemy preview: {selectedEnemyPreview}
                      {selectedEnemyIds.length > 3 ? "..." : ""}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={openPlayerModal}
                  disabled={!canStartAdventure}
                  className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {canStartAdventure ? "Start Adventure" : "Select At Least 1 Enemy"}
                </button>
              </div>
            ) : null}

            {activeTab === "multi" ? (
              <div className="mt-4 space-y-3">
                <h2 className="text-lg font-bold">Multiplayer</h2>
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-900/20 p-3">
                  <p className="text-sm font-semibold text-emerald-200">Party matchmaking ready UI</p>
                  <p className="mt-1 text-xs text-zinc-300">
                    Backend integration can use your existing auth and future socket server.
                  </p>
                </div>
                <button
                  type="button"
                  className="w-full rounded-xl border border-cyan-300/40 px-4 py-3 text-sm font-semibold"
                >
                  Quick Match
                </button>
                <button
                  type="button"
                  className="w-full rounded-xl border border-cyan-300/40 px-4 py-3 text-sm font-semibold"
                >
                  Create Squad
                </button>

                <div>
                  <h3 className="text-sm font-bold">Top Players</h3>
                  <div className="mt-2 space-y-2">
                    {leaderboard.length === 0 ? (
                      <p className="text-xs text-zinc-400">No data yet.</p>
                    ) : (
                      leaderboard.map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2 text-xs"
                        >
                          <span>{player.name}</span>
                          <span className="text-cyan-300">Lv {player.level}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "settings" ? (
              <div className="mt-4 space-y-4">
                <h2 className="text-lg font-bold">Game Settings</h2>

                <div className="rounded-xl bg-zinc-900/60 p-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="mouseSensitivity" className="text-sm font-semibold">
                      Mouse Sensitivity
                    </label>
                    <span className="text-xs text-cyan-300">{mouseSensitivity}</span>
                  </div>
                  <input
                    id="mouseSensitivity"
                    type="range"
                    min={1}
                    max={100}
                    value={mouseSensitivity}
                    onChange={(event) => setMouseSensitivity(Number(event.target.value))}
                    className="mt-3 w-full accent-cyan-300"
                  />
                </div>

                <div className="rounded-xl bg-zinc-900/60 p-3">
                  <label className="text-sm font-semibold">Graphics Quality</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {graphicsOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setGraphicsQuality(option)}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase ${
                          graphicsQuality === option
                            ? "bg-cyan-300 text-slate-950"
                            : "border border-zinc-700 text-zinc-200"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-900/60 p-3">
                  <p className="text-sm font-semibold">Keybindings</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {keybindEntries.map(([action, value]) => (
                      <label key={action} className="space-y-1">
                        <span className="block text-xs uppercase text-zinc-400">
                          {toDisplayAction(action)}
                        </span>
                        <input
                          value={value}
                          maxLength={10}
                          onChange={(event) => setKeybind(action, event.target.value)}
                          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-cyan-300"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2 rounded-lg border border-zinc-700/70 bg-zinc-950/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                      Add Custom Action
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={newActionName}
                        onChange={(event) => setNewActionName(event.target.value)}
                        placeholder="Action name (e.g. dodge)"
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs outline-none focus:border-cyan-300"
                      />
                      <input
                        value={newActionKey}
                        onChange={(event) => setNewActionKey(event.target.value)}
                        placeholder="Key (e.g. E)"
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs outline-none focus:border-cyan-300"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addCustomKeybind}
                      className="w-full rounded-lg border border-cyan-300/40 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-900/40"
                    >
                      Add Keybinding
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-zinc-400">
                    Press any bound key to test input reaction.
                  </p>
                  <p className="mt-1 text-xs font-semibold text-cyan-300">
                    Active Action: {lastTriggeredAction ? toDisplayAction(lastTriggeredAction) : "none"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetDefaults}
                  className="w-full rounded-xl border border-rose-300/40 px-4 py-2 text-sm font-semibold text-rose-200"
                >
                  Reset Defaults
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      </main>

      <PlayerSelectionModal
        isOpen={isPlayerModalOpen}
        players={players}
        playersLoading={playersLoading}
        playersError={playersError}
        pendingPlayerId={pendingPlayerId}
        pendingPlayer={pendingPlayer}
        selectedMapName={selectedMapMeta.name}
        selectedEnemyCount={selectedEnemyIds.length}
        selectedEnemyPreview={selectedEnemyPreview}
        onClose={() => setIsPlayerModalOpen(false)}
        onSelectPlayer={setPendingPlayerId}
        onConfirm={confirmPlayerSelection}
        confirmDisabled={!pendingPlayer || playersLoading || selectedEnemyIds.length === 0}
      />
    </>
  );
}

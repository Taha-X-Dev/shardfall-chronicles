"use client";

import { useEffect, useMemo, useState } from "react";
import { bosses, classes, gameIntro, gameName } from "@/lib/game/lore";
import { LobbyScene } from "@/components/game/lobby-scene";
import { useGameSettingsStore, type GraphicsQuality } from "@/store/game-settings";

type LobbyTab = "single" | "multi" | "settings";

type LeaderboardPlayer = {
  id: number;
  name: string;
  level: number;
  experience: number;
};

const tabs: { id: LobbyTab; label: string }[] = [
  { id: "single", label: "Single Player" },
  { id: "multi", label: "Multiplayer" },
  { id: "settings", label: "Settings" },
];

const graphicsOptions: GraphicsQuality[] = ["low", "medium", "high", "ultra"];

export function GameLobby() {
  const [activeTab, setActiveTab] = useState<LobbyTab>("single");
  const [backendStatus, setBackendStatus] = useState("Checking backend...");
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [selectedClass, setSelectedClass] = useState(classes[0].id);
  const [newActionName, setNewActionName] = useState("");
  const [newActionKey, setNewActionKey] = useState("");
  const [lastTriggeredAction, setLastTriggeredAction] = useState<string | null>(null);

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
  const keybindEntries = Object.entries(keybinds) as Array<[string, string]>;

  useEffect(() => {
    const controller = new AbortController();

    const loadLobbyData = async () => {
      try {
        const [healthRes, boardRes] = await Promise.all([
          fetch(`${apiBaseUrl}/health`, { signal: controller.signal }),
          fetch(`${apiBaseUrl}/api/leaderboard?limit=5`, { signal: controller.signal }),
        ]);

        if (!healthRes.ok) {
          setBackendStatus("Backend unreachable");
        } else {
          setBackendStatus("Backend online");
        }

        if (boardRes.ok) {
          const boardData = await boardRes.json();
          setLeaderboard(boardData.players ?? []);
        }
      } catch {
        setBackendStatus("Backend unreachable");
      }
    };

    void loadLobbyData();

    return () => {
      controller.abort();
    };
  }, [apiBaseUrl]);

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

  const addCustomKeybind = () => {
    const action = newActionName.trim();
    const key = newActionKey.trim();
    if (!action || !key) return;

    addKeybind(action, key);
    setNewActionName("");
    setNewActionKey("");
  };

  const toDisplayAction = (action: string) => action.replace(/_/g, " ");

  return (
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

              <button
                type="button"
                className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
              >
                Start Adventure
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
              <button type="button" className="w-full rounded-xl border border-cyan-300/40 px-4 py-3 text-sm font-semibold">
                Quick Match
              </button>
              <button type="button" className="w-full rounded-xl border border-cyan-300/40 px-4 py-3 text-sm font-semibold">
                Create Squad
              </button>

              <div>
                <h3 className="text-sm font-bold">Top Players</h3>
                <div className="mt-2 space-y-2">
                  {leaderboard.length === 0 ? (
                    <p className="text-xs text-zinc-400">No data yet.</p>
                  ) : (
                    leaderboard.map((player) => (
                      <div key={player.id} className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2 text-xs">
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
  );
}

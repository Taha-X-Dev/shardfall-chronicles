import { gameName } from "@/lib/game/lore";
import type { BackendPlayer } from "@/features/game-lobby/model/types";

type LoadingWorldScreenProps = {
  activePlayer: BackendPlayer;
  selectedClassName: string;
  selectedMapName: string;
  selectedEnemyCount: number;
  loadingProgress: number;
  loadingHint: string;
};

export function LoadingWorldScreen({
  activePlayer,
  selectedClassName,
  selectedMapName,
  selectedEnemyCount,
  loadingProgress,
  loadingHint,
}: LoadingWorldScreenProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_20%,#082f49,#020617_60%)] px-4 text-zinc-100">
      <section className="w-full max-w-2xl rounded-3xl border border-cyan-300/30 bg-slate-950/80 p-6 shadow-[0_25px_120px_-40px_rgba(34,211,238,0.55)]">
        <p className="text-xs uppercase tracking-[0.26em] text-cyan-300">Loading World</p>
        <h2 className="mt-2 text-3xl font-black">Entering {gameName}</h2>
        <p className="mt-3 text-sm text-zinc-300">
          Player: <span className="font-semibold text-cyan-300">{activePlayer.name}</span> | Class:{" "}
          <span className="font-semibold text-cyan-300">{selectedClassName}</span>
        </p>
        <p className="mt-1 text-xs text-cyan-200">
          Map: {selectedMapName} • Enemy pool: {selectedEnemyCount}
        </p>

        <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 transition-all duration-300"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-zinc-300">{loadingHint}</span>
          <span className="font-semibold text-cyan-300">{loadingProgress}%</span>
        </div>
      </section>
    </main>
  );
}

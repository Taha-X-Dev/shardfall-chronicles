import type { BackendPlayer } from "@/features/game-lobby/model/types";

type PlayerSelectionModalProps = {
  isOpen: boolean;
  players: BackendPlayer[];
  playersLoading: boolean;
  playersError: string | null;
  pendingPlayerId: number | null;
  pendingPlayer: BackendPlayer | null;
  selectedMapName: string;
  selectedEnemyCount: number;
  selectedEnemyPreview: string;
  onClose: () => void;
  onSelectPlayer: (id: number) => void;
  onConfirm: () => void;
  confirmDisabled: boolean;
};

export function PlayerSelectionModal({
  isOpen,
  players,
  playersLoading,
  playersError,
  pendingPlayerId,
  pendingPlayer,
  selectedMapName,
  selectedEnemyCount,
  selectedEnemyPreview,
  onClose,
  onSelectPlayer,
  onConfirm,
  confirmDisabled,
}: PlayerSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-cyan-300/25 bg-slate-950/95 p-5 shadow-[0_25px_80px_-20px_rgba(34,211,238,0.45)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Choose Player</p>
            <h3 className="mt-1 text-xl font-black">Select Your Hero From Backend</h3>
            <p className="mt-1 text-xs text-zinc-300">
              Pulled from `/api/players` (for example: taha, mustafa, weakguy).
            </p>
            <p className="mt-1 text-xs text-cyan-200">
              Map: {selectedMapName} • Enemies selected: {selectedEnemyCount}
            </p>
            {selectedEnemyPreview ? (
              <p className="mt-1 text-xs text-zinc-300">
                Preview: {selectedEnemyPreview}
                {selectedEnemyCount > 3 ? "..." : ""}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500"
          >
            Close
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          {playersLoading ? <p className="text-sm text-zinc-300">Loading players...</p> : null}

          {playersError && !playersLoading ? <p className="text-sm text-rose-300">{playersError}</p> : null}

          {!playersLoading && !playersError ? (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {players.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onSelectPlayer(player.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    pendingPlayerId === player.id
                      ? "border-cyan-300 bg-cyan-600/20"
                      : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">{player.name}</p>
                    <span className="text-xs text-cyan-300">ID {player.id}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-300">
                    Level {player.level ?? "-"} • Health {player.health ?? "-"} • Mana {player.mana ?? "-"} • Coins {player.coins ?? "-"}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-300">
            Selected: <span className="font-semibold text-cyan-300">{pendingPlayer ? pendingPlayer.name : "none"}</span>
          </p>

          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm Player
          </button>
        </div>
      </div>
    </div>
  );
}

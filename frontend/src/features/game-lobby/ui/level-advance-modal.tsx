import { toSigned } from "@/features/game-lobby/model/utils";
import type { LevelAdvanceModal as LevelAdvanceModalType } from "@/features/game-lobby/model/types";

type LevelAdvanceModalProps = {
  levelAdvanceModal: LevelAdvanceModalType | null;
  onContinue: () => void;
};

export function LevelAdvanceModal({ levelAdvanceModal, onContinue }: LevelAdvanceModalProps) {
  if (!levelAdvanceModal) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-cyan-300/35 bg-slate-950/92 p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Portal Transition</p>
        <h3 className="mt-2 text-xl font-black">Level {levelAdvanceModal.fromLevel} Complete</h3>
        <p className="mt-1 text-sm text-zinc-300">
          You jumped into the portal. Review your updates, then continue to Level {levelAdvanceModal.toLevel}.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Level Gain</p>
            <p className="mt-1 text-lg font-black text-cyan-200">{toSigned(levelAdvanceModal.gained.level)}</p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-400">HP Change</p>
            <p className="mt-1 text-lg font-black text-rose-200">{toSigned(levelAdvanceModal.gained.health)}</p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Mana Change</p>
            <p className="mt-1 text-lg font-black text-cyan-200">{toSigned(levelAdvanceModal.gained.mana)}</p>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 text-xs text-zinc-300">
          Current Stats: Level {levelAdvanceModal.current.level} • HP {levelAdvanceModal.current.health} • Mana {levelAdvanceModal.current.mana}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl bg-cyan-300 px-5 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
          >
            Continue To Level {levelAdvanceModal.toLevel}
          </button>
        </div>
      </div>
    </div>
  );
}

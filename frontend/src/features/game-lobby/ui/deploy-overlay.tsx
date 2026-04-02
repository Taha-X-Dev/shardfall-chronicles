type DeployOverlayProps = {
  selectedMapName: string;
  selectedEnemyCount: number;
  onContinue: () => void;
};

export function DeployOverlay({ selectedMapName, selectedEnemyCount, onContinue }: DeployOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/55">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-cyan-300/35 bg-slate-950/88 p-5 text-center shadow-[0_24px_90px_-30px_rgba(34,211,238,0.75)]">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Mission Deploy</p>
        <h3 className="mt-2 text-2xl font-black">Continue To First Person Combat</h3>
        <p className="mt-2 text-sm text-zinc-300">
          Full screen mode, mouse-look camera, left and right click attacks are enabled after Continue.
        </p>
        <p className="mt-2 text-xs text-cyan-200">
          Deploying to {selectedMapName} with {selectedEnemyCount} selected enemies.
        </p>
        <p className="mt-1 text-xs text-zinc-300">Quest chain: 5 levels. Clearing all enemies advances to next level.</p>
        <button
          type="button"
          onClick={onContinue}
          className="mt-4 rounded-xl bg-cyan-300 px-5 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

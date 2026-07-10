import FindingCard from './FindingCard.jsx';
import ManualChecklist from './ManualChecklist.jsx';

const GRADE_COLOR = {
  A: 'text-emerald-600',
  B: 'text-lime-600',
  C: 'text-amber-600',
  D: 'text-orange-500',
  F: 'text-red-500',
};

export default function LayerSection({ layer }) {
  // A layer that doesn't apply to this repo (no backend / no database) renders as
  // a slim, honest note rather than a misleading green "A".
  if (layer.notApplicable) {
    return (
      <section className="rounded-3xl bg-white/70 p-5 ring-1 ring-emerald-900/5">
        <div className="flex items-center gap-2">
          <span className="h-6 w-1.5 rounded-full bg-slate-200" />
          <h3 className="text-lg font-semibold text-slate-500">{layer.label}</h3>
          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
            Not applicable
          </span>
        </div>
        <p className="mt-2 pl-3.5 text-sm text-slate-500">
          No {layer.label.toLowerCase()} surface detected in this repository — these checks were skipped and don't affect the score.
        </p>
      </section>
    );
  }

  // Sort worst-first so the scariest findings sit at the top.
  const order = { fail: 0, error: 1, warn: 2, na: 3, pass: 4 };
  const checks = [...layer.checks].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm shadow-emerald-900/5 ring-1 ring-emerald-900/5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-lime-400 to-emerald-600" />
          <h3 className="text-lg font-semibold text-slate-800">{layer.label}</h3>
        </div>
        <div className="flex items-baseline gap-2">
          {layer.verifiable && (
            <span className="mr-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
              verifiable posture
            </span>
          )}
          <span className={`text-2xl font-bold ${GRADE_COLOR[layer.grade] || 'text-slate-500'}`}>
            {layer.grade}
          </span>
          <span className="text-sm text-slate-400 tabular-nums">{layer.score}/100</span>
        </div>
      </header>

      <div className="grid gap-3">
        {checks.map((c) => (
          <FindingCard key={c.id} check={c} />
        ))}
      </div>

      {layer.manualChecklist && <ManualChecklist items={layer.manualChecklist} />}
    </section>
  );
}

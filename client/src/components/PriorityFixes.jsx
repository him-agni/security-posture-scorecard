const STATUS_STYLE = {
  fail: 'bg-red-50 text-red-700 ring-red-200',
  error: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
  warn: 'bg-amber-50 text-amber-700 ring-amber-200',
  manual: 'bg-slate-50 text-slate-600 ring-slate-200',
};

export default function PriorityFixes({ fixes = [] }) {
  if (!fixes.length) {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-sm shadow-emerald-900/5 ring-1 ring-emerald-900/5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            ✓
          </span>
          <div>
            <h2 className="font-semibold text-slate-800">Review First</h2>
            <p className="text-sm text-slate-500">No high-priority observations surfaced in scored checks.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm shadow-emerald-900/5 ring-1 ring-emerald-900/5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Review First</h2>
          <p className="text-sm text-slate-500">Highest-impact observations, ordered by severity, score impact, and confidence.</p>
        </div>
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-100">
          {fixes.length} observations
        </span>
      </div>

      <ol className="space-y-3">
        {fixes.map((fix) => (
          <li key={fix.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {fix.rank}
              </span>
              <h3 className="font-semibold text-slate-800">{fix.title}</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ring-1 ${STATUS_STYLE[fix.status] || STATUS_STYLE.manual}`}>
                {fix.status}
              </span>
              <span className="ml-auto text-xs font-medium uppercase text-slate-500">
                {fix.layer} · {fix.severity}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{fix.why}</p>
            {fix.firstFinding?.file && (
              <code className="mt-2 inline-block rounded bg-slate-800 px-1.5 py-0.5 text-xs text-lime-200">
                {fix.firstFinding.file}
                {fix.firstFinding.line ? `:${fix.firstFinding.line}` : ''}
              </code>
            )}
            {fix.pointsLost > 0 && (
              <p className="mt-2 text-xs font-medium text-red-500">-{fix.pointsLost} weighted points</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

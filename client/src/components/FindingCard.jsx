import ConfidenceBadge from './ConfidenceBadge.jsx';

// Status stays semantic (dataviz rule) and always ships with a label + dot,
// never color alone.
const STATUS = {
  pass: { label: 'Clear', dot: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-200', wash: 'bg-emerald-50/60' },
  warn: { label: 'Watch', dot: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-200', wash: 'bg-amber-50/60' },
  fail: { label: 'Attention', dot: 'bg-red-500', text: 'text-red-600', ring: 'ring-red-200', wash: 'bg-red-50/60' },
  na: { label: 'N/A', dot: 'bg-slate-400', text: 'text-slate-500', ring: 'ring-slate-200', wash: 'bg-slate-50' },
  error: { label: 'Error', dot: 'bg-fuchsia-500', text: 'text-fuchsia-600', ring: 'ring-fuchsia-200', wash: 'bg-fuchsia-50/60' },
};

const SEVERITY = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-amber-600',
  low: 'text-slate-400',
};

export default function FindingCard({ check }) {
  const s = STATUS[check.status] || STATUS.na;
  const impact = check.scoreImpact;

  return (
    <div className={`rounded-2xl ${s.wash} p-4 ring-1 ring-inset ${s.ring}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
        <h4 className="font-semibold text-slate-800">{check.label}</h4>
        <span className={`text-xs font-semibold uppercase tracking-wide ${s.text}`}>{s.label}</span>
        <ConfidenceBadge confidence={check.confidence} />
        <span className={`ml-auto text-xs font-medium uppercase ${SEVERITY[check.severity] || 'text-slate-400'}`}>
          {check.severity}
        </span>
      </div>

      {check.findings?.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {check.findings.map((f, i) => (
            <li key={i} className="text-sm text-slate-600">
              {(f.file || f.line) && (
                <code className="mr-2 rounded bg-slate-800 px-1.5 py-0.5 text-xs text-lime-200">
                  {f.file}
                  {f.line ? `:${f.line}` : ''}
                </code>
              )}
              {f.message}
            </li>
          ))}
        </ul>
      )}

      {impact && (
        <div className="mt-3 text-xs text-slate-400">
          {impact.counted ? (
            <>
              Weight {impact.weight} ·{' '}
              <span className={impact.deduction ? 'text-red-500' : 'text-emerald-600'}>
                −{impact.deduction} pts
              </span>
            </>
          ) : (
            <>Informational — excluded from score</>
          )}
        </div>
      )}
    </div>
  );
}

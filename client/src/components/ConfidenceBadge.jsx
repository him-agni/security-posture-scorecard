// The confidence field is the "honest tool" thesis made visible.
const STYLES = {
  verified: {
    label: 'Verified',
    cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    title: 'High confidence — determined directly from source.',
  },
  detected: {
    label: 'Detected',
    cls: 'bg-amber-100 text-amber-700 ring-amber-200',
    title: 'Heuristic — a pattern was detected, but full coverage is not guaranteed.',
  },
  manual: {
    label: 'Manual',
    cls: 'bg-slate-100 text-slate-600 ring-slate-200',
    title: 'Cannot be determined from source — informational only, does not affect the score.',
  },
};

export default function ConfidenceBadge({ confidence }) {
  const s = STYLES[confidence] || STYLES.manual;
  return (
    <span
      title={s.title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </span>
  );
}

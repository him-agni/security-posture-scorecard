// Layer 3's signature: the "here's what I can't see — go verify it" panel.
// Deliberately NOT green checkmarks. Amber, advisory, with a why on each item.
const SEV = {
  critical: 'text-red-600 bg-red-100 ring-red-200',
  high: 'text-orange-600 bg-orange-100 ring-orange-200',
  medium: 'text-amber-700 bg-amber-100 ring-amber-200',
  low: 'text-slate-600 bg-slate-100 ring-slate-200',
};

export default function ManualChecklist({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-50/70 p-4">
      <div className="flex items-start gap-2">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 flex-none text-amber-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <h4 className="font-semibold text-amber-900">Confirm these yourself — can't be verified from source</h4>
          <p className="text-xs text-amber-700/80">
            {items.length} item{items.length === 1 ? '' : 's'} that live in your database provider / infrastructure, not your
            code. They don't affect the score — but they're the ones that matter most.
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl bg-white/70 p-3 ring-1 ring-amber-200/70">
            <div className="flex items-center gap-2">
              <span className="grid h-4 w-4 place-items-center rounded border border-amber-300 text-transparent">□</span>
              <span className="font-medium text-slate-800">{item.label}</span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ring-1 ring-inset ${SEV[item.severity] || SEV.low}`}>
                {item.severity}
              </span>
            </div>
            <p className="mt-1 pl-6 text-sm text-slate-600">{item.why}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

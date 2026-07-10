import ScoreGauge from './ScoreGauge.jsx';

// Fixed twinkle positions so they don't reshuffle on every render.
const STARS = [
  { top: '12%', left: '18%', d: '0s' },
  { top: '20%', left: '72%', d: '0.6s' },
  { top: '30%', left: '40%', d: '1.2s' },
  { top: '16%', left: '88%', d: '1.8s' },
  { top: '38%', left: '10%', d: '0.9s' },
  { top: '44%', left: '80%', d: '1.5s' },
  { top: '9%', left: '55%', d: '2.1s' },
];

function Stat({ label, value, tone }) {
  const tones = {
    good: 'text-lime-300',
    warn: 'text-amber-300',
    bad: 'text-red-300',
    info: 'text-emerald-200',
  };
  return (
    <div className="rounded-2xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10 backdrop-blur">
      <div className={`text-2xl font-bold tabular-nums ${tones[tone] || 'text-white'}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
    </div>
  );
}

export default function SidePanel({ report }) {
  // Tally check statuses across applicable layers for the mini summary.
  let clear = 0, watch = 0, attention = 0, info = 0;
  if (report) {
    for (const l of report.layers) {
      if (l.notApplicable) continue;
      for (const c of l.checks) {
        if (c.status === 'pass') clear++;
        else if (c.status === 'warn') watch++;
        else if (c.status === 'fail' || c.status === 'error') attention++;
        else info++;
      }
    }
  }

  return (
    <aside className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-emerald-950/20"
      style={{ background: 'linear-gradient(160deg, #1f3d34 0%, #24503f 45%, #2c6249 100%)' }}
    >
      {/* --- animated decorative layer --- */}
      <div className="pointer-events-none absolute inset-0">
        {/* floating aurora blobs */}
        <div className="animate-float-slow absolute -left-10 -top-8 h-40 w-40 rounded-full bg-lime-400/20 blur-3xl" />
        <div className="animate-float-slower absolute -right-12 top-24 h-48 w-48 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="animate-float-slow absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-teal-400/10 blur-3xl" />
        {/* twinkling dots */}
        {STARS.map((s, i) => (
          <span
            key={i}
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-white"
            style={{ top: s.top, left: s.left, animationDelay: s.d }}
          />
        ))}
        {/* shimmer sweep */}
        <div className="animate-shimmer absolute -inset-y-2 left-0 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      {/* --- content --- */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-lime-300" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5l-8-3Z" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">Posture Summary</p>
            <p className="text-xs text-white/50">Frontend · Backend · Database</p>
          </div>
        </div>

        {report ? (
          <>
            {/* gauge with radar pulse rings behind it */}
            <div className="relative my-6 grid place-items-center">
              <span className="animate-radar absolute h-40 w-40 rounded-full border border-lime-300/40" />
              <span className="animate-radar absolute h-40 w-40 rounded-full border border-lime-300/40" style={{ animationDelay: '1.6s' }} />
              <ScoreGauge score={report.overall.score} grade={report.overall.grade} onDark />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Clear" value={clear} tone="good" />
              <Stat label="Watch" value={watch} tone="warn" />
              <Stat label="Attention" value={attention} tone="bad" />
              <Stat label="Manual" value={info} tone="info" />
            </div>

            {report.scoring && (
              <div className="mt-4 rounded-2xl bg-black/20 p-3 text-xs text-white/70 ring-1 ring-white/10">
                <p className="mb-1 font-medium text-white/90">Why this score</p>
                <p>
                  {report.scoring.pointsEarned}/{report.scoring.totalWeight} weighted points ·{' '}
                  <span className="text-red-300">{report.scoring.pointsLost} lost</span>
                </p>
              </div>
            )}

            <a
              href={`https://github.com/${report.repo}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block truncate rounded-xl bg-white/10 px-3 py-2 text-center text-sm text-lime-200 ring-1 ring-white/10 transition hover:bg-white/15"
            >
              {report.repo} ↗
            </a>
          </>
        ) : (
          <div className="my-8 flex flex-col items-center gap-4 text-center">
            <div className="relative grid place-items-center">
              <span className="animate-radar absolute h-28 w-28 rounded-full border border-lime-300/40" />
              <span className="animate-radar absolute h-28 w-28 rounded-full border border-lime-300/40" style={{ animationDelay: '1.6s' }} />
              <span className="grid h-20 w-20 place-items-center rounded-full bg-white/5 ring-1 ring-white/10">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-lime-300/80" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
              </span>
            </div>
            <p className="text-sm text-white/60">Scan a repo to see its posture summary here.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

// Radial meter for the overall score. Grade colors run the reference's green
// scale for good grades, then shift to amber/red as a status signal for poor ones.
const GRADE_COLOR = {
  A: '#8ed94f', // bright lime-green
  B: '#a7e06a', // lime
  C: '#f2c14e', // amber
  D: '#f0955a', // orange
  F: '#ef6d6d', // red
};

export default function ScoreGauge({ score, grade, size = 172, onDark = true }) {
  const stroke = 13;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - pct / 100);
  const color = GRADE_COLOR[grade] || '#a7e06a';
  const track = onDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0';
  const sub = onDark ? 'text-white/60' : 'text-slate-400';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className={`text-xs ${sub}`}>out of 100</span>
        <span className="mt-1 text-xl font-semibold" style={{ color }}>
          Grade {grade}
        </span>
      </div>
    </div>
  );
}

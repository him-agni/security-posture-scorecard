// The reference's signature move: soft rounded cards on a light-lime -> forest
// green scale. We map the scale to meaning so it stays honest for a security tool.
const TONES = {
  lime: 'bg-[#e6f2c4] text-[#3f5218] ring-[#d4e6a3]',
  green: 'bg-[#a9d276] text-[#22400f] ring-[#98c463]',
  forest: 'bg-[#264d2f] text-lime-50 ring-[#1c3a23]',
  amber: 'bg-[#fbe6c3] text-[#7a531a] ring-[#f0d59a]',
  red: 'bg-[#f7d6d3] text-[#8a2c26] ring-[#eeb8b3]',
};

export default function StatTile({ label, value, sub, tone = 'lime', icon }) {
  return (
    <div className={`rounded-2xl px-4 py-3.5 ring-1 ring-inset ${TONES[tone] || TONES.lime}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
        {icon}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        {sub && <span className="text-xs opacity-70">{sub}</span>}
      </div>
    </div>
  );
}

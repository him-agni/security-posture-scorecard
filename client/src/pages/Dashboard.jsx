import { useScan } from '../hooks/useScan';
import RepoInput from '../components/RepoInput.jsx';
import LayerSection from '../components/LayerSection.jsx';
import SidePanel from '../components/SidePanel.jsx';
import StatTile from '../components/StatTile.jsx';

function tally(report) {
  let total = 0, pass = 0, warn = 0, fail = 0;
  for (const l of report.layers) {
    if (l.notApplicable) continue; // don't count skipped layers
    for (const c of l.checks) {
      total++;
      if (c.status === 'pass') pass++;
      else if (c.status === 'warn') warn++;
      else if (c.status === 'fail' || c.status === 'error') fail++;
    }
  }
  return { total, pass, warn, fail };
}

export default function Dashboard() {
  const scan = useScan();
  const report = scan.data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <header className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-600 text-white shadow-sm shadow-emerald-600/20">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5l-8-3Z" strokeLinejoin="round" />
            <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Security Posture Scorecard</h1>
          <p className="text-sm text-slate-500">
            Every finding shows its confidence —{' '}
            <span className="font-medium text-emerald-600">verified</span>,{' '}
            <span className="font-medium text-amber-600">detected</span>, or{' '}
            <span className="font-medium text-slate-500">manual</span>.
          </p>
        </div>
      </header>

      <div className="mb-6">
        <RepoInput onScan={(url) => scan.mutate(url)} isLoading={scan.isPending} />
      </div>

      {scan.isError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {scan.error.message}
        </div>
      )}

      {/* Two-column: main content + animated side panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="order-2 space-y-6 lg:order-1">
          {scan.isPending && (
            <div className="flex items-center gap-3 rounded-3xl bg-white p-6 text-slate-500 shadow-sm ring-1 ring-emerald-900/5">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
              Downloading and scanning the repository…
            </div>
          )}

          {report && !scan.isPending && (
            <>
              {/* Color-coded KPI row — the reference's lime -> forest scale */}
              {(() => {
                const t = tally(report);
                return (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile tone="forest" label="Overall" value={`${report.overall.score}`} sub={`Grade ${report.overall.grade}`} />
                    <StatTile tone="green" label="Passed" value={t.pass} sub={`/ ${t.total}`} />
                    <StatTile tone="amber" label="Warnings" value={t.warn} />
                    <StatTile tone={t.fail ? 'red' : 'lime'} label="Failing" value={t.fail} />
                  </div>
                );
              })()}

              {report.layers.map((layer) => (
                <div key={layer.id} className="animate-rise">
                  <LayerSection layer={layer} />
                </div>
              ))}
            </>
          )}

          {!report && !scan.isPending && !scan.isError && (
            <div className="rounded-3xl border border-dashed border-emerald-900/15 bg-white/50 p-10 text-center text-slate-500">
              Enter a repository above to generate its scorecard.
            </div>
          )}
        </div>

        {/* Side panel (sticky on desktop) with the small animations */}
        <div className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-6">
            <SidePanel report={report && !scan.isPending ? report : null} />
          </div>
        </div>
      </div>

      <footer className="mt-10 border-t border-emerald-900/10 pt-4 text-center text-xs text-slate-400">
        3 layers · Frontend (mostly verified) · Backend (mostly detected) · Database (mostly manual). The tool grades what it can prove and lists what it can't.
      </footer>
    </div>
  );
}

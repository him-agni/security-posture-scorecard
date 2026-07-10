import { useState } from 'react';

const EXAMPLES = ['sindresorhus/slugify', 'facebook/react', 'expressjs/express'];

export default function RepoInput({ onScan, isLoading }) {
  const [value, setValue] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (value.trim() && !isLoading) onScan(value.trim());
  };

  return (
    <div className="w-full">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://github.com/owner/repo  or  owner/repo"
          className="flex-1 rounded-2xl border border-emerald-900/10 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="rounded-2xl bg-gradient-to-r from-lime-500 to-emerald-600 px-6 py-3 font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:from-lime-400 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Scanning…' : 'Scan repo'}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => !isLoading && onScan(ex)}
            className="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-emerald-900/10 transition hover:bg-emerald-50 hover:text-emerald-700"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

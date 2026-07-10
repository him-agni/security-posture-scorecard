const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Thin fetch wrapper. In local dev, Vite proxies /api to the server.
export async function scanRepo(repoUrl) {
  const res = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Scan failed (${res.status})`);
  }
  return data;
}

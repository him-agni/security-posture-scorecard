import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scanRepo } from './api';

describe('scanRepo', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts the repository input to the scan endpoint', async () => {
    const report = { overall: { score: 97, grade: 'A' }, layers: [] };
    fetch.mockResolvedValue({
      ok: true,
      json: async () => report,
    });

    await expect(scanRepo('owner/repo')).resolves.toEqual(report);
    expect(fetch).toHaveBeenCalledWith('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl: 'owner/repo' }),
    });
  });

  it('surfaces API error messages', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'GitHub API rate limit hit.' }),
    });

    await expect(scanRepo('owner/repo')).rejects.toThrow('GitHub API rate limit hit.');
  });
});

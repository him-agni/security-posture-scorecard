const { buildContext } = require('../lib/fileTree');
const { checks, layers: layerMeta } = require('../checks');

/**
 * Build the file-tree context once, run every registered check against it, and
 * group results by layer (in registry layer order). Checks may be sync or async
 * (e.g. the OSV lookup). A check that throws is isolated so one bad module can't
 * fail the whole scan.
 */
async function runScan(repoCtx) {
  const ctx = buildContext(repoCtx.rootDir);

  const results = await Promise.all(
    checks.map(async (check) => {
      try {
        const result = await check.run(ctx);
        return { layer: check.layer, ...result };
      } catch (err) {
        console.error(`[check:${check.id}] threw:`, err.message);
        return {
          layer: check.layer,
          id: check.id,
          label: check.label,
          status: 'error',
          confidence: 'manual',
          severity: check.severity,
          findings: [{ message: `Check failed to run: ${err.message}` }],
        };
      }
    })
  );

  // Group into layers, seeded in the registry's declared order.
  const byLayer = new Map(layerMeta.map((l) => [l.id, []]));
  for (const r of results) {
    if (!byLayer.has(r.layer)) byLayer.set(r.layer, []);
    byLayer.get(r.layer).push(r);
  }
  // Drop any layer that ended up with no checks.
  for (const [id, list] of byLayer) if (list.length === 0) byLayer.delete(id);

  return byLayer;
}

module.exports = { runScan };

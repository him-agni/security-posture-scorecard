const config = require('../config');
const { layers: layerMeta } = require('../checks');

// How much of its weight a check "keeps": pass = all, warn = half, fail = none.
// manual / na / error do not participate (can't be verified -> can't be scored).
const STATUS_FACTOR = { pass: 1, warn: 0.5, fail: 0 };
const CONFIDENCE_RANK = { verified: 3, detected: 2, manual: 1 };
const STATUS_PRIORITY = { fail: 3, error: 3, warn: 2 };

function gradeFor(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function scoreChecks(checks) {
  let weight = 0;
  let earned = 0;
  const scored = checks.map((c) => {
    const w = config.severityWeights[c.severity] ?? 0;
    const participates = c.confidence !== 'manual' && c.status in STATUS_FACTOR;
    let impact;
    if (participates) {
      const factor = STATUS_FACTOR[c.status];
      weight += w;
      earned += w * factor;
      impact = { weight: w, deduction: Math.round(w * (1 - factor)), counted: true };
    } else {
      impact = { weight: 0, deduction: 0, counted: false };
    }
    return { ...c, scoreImpact: impact };
  });
  const score = weight === 0 ? 100 : Math.round((earned / weight) * 100);
  return { scored, weight, earned, score };
}

function buildPriorityFixes(reportLayers) {
  const fixes = [];

  for (const layer of reportLayers) {
    if (layer.notApplicable) continue;
    for (const check of layer.checks) {
      if (!['fail', 'error', 'warn'].includes(check.status)) continue;

      fixes.push({
        id: `${layer.id}:${check.id}`,
        layerId: layer.id,
        layer: layer.label,
        checkId: check.id,
        title: check.label,
        status: check.status,
        severity: check.severity,
        confidence: check.confidence,
        pointsLost: check.scoreImpact?.deduction || 0,
        why: summarizeFix(check),
        firstFinding: check.findings?.[0] || null,
      });
    }

    if (Array.isArray(layer.manualChecklist)) {
      for (const item of layer.manualChecklist) {
        fixes.push({
          id: `${layer.id}:manual:${item.id}`,
          layerId: layer.id,
          layer: layer.label,
          checkId: item.id,
          title: item.label,
          status: 'manual',
          severity: item.severity,
          confidence: 'manual',
          pointsLost: 0,
          why: item.why,
          firstFinding: null,
        });
      }
    }
  }

  return fixes
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 5)
    .map((fix, index) => ({ rank: index + 1, ...fix }));
}

function priorityScore(fix) {
  const severityWeight = config.severityWeights[fix.severity] || 0;
  return (
    severityWeight * 100 +
    (fix.pointsLost || 0) * 10 +
    (STATUS_PRIORITY[fix.status] || 1) * 8 +
    (CONFIDENCE_RANK[fix.confidence] || 0)
  );
}

function summarizeFix(check) {
  const finding = check.findings?.[0];
  if (finding?.message) return finding.message;
  if (check.status === 'error') return 'This observation could not be completed; review this area before relying on the scan.';
  if (check.status === 'fail') return 'This scored observation had the largest impact and is worth reviewing before lower-impact items.';
  return 'This observation reduced the score; review it after higher-severity observations.';
}

/**
 * Turn the runner's per-layer results into the final report + scores.
 * @param {{repo:string, defaultBranch?:string, layers: Map<string, object[]>}} input
 */
function scoreReport({ repo, defaultBranch, layers }) {
  const labelFor = Object.fromEntries(layerMeta.map((l) => [l.id, l.label]));

  let totalWeight = 0;
  let totalEarned = 0;
  const reportLayers = [];

  for (const [layerId, rawChecks] of layers.entries()) {
    // Lift any advisory checklist (Tier-3) off its carrier check onto the layer,
    // and keep it out of the normal check-card list.
    const manualChecklist = [];
    const supportNotices = [];
    const checks = [];
    for (const c of rawChecks) {
      if (Array.isArray(c.checklist)) {
        manualChecklist.push(...c.checklist);
        continue; // carrier check is not rendered as a card
      }
      if (c.id === 'project-support' && c.support && !c.support.supported) {
        supportNotices.push(c.support);
        continue;
      }
      checks.push(c);
    }

    const { scored, weight, earned, score } = scoreChecks(checks);
    totalWeight += weight;
    totalEarned += earned;

    // A layer is "not applicable" when nothing verifiable applied AND it has no
    // advisory checklist to show (e.g. no backend / no database in the repo).
    const notApplicable = weight === 0 && manualChecklist.length === 0 &&
      scored.every((c) => c.status === 'na');

    reportLayers.push({
      id: layerId,
      label: labelFor[layerId] || layerId,
      score,
      grade: gradeFor(score),
      // score reflects only verifiable+detected checks -> it IS a "verifiable posture".
      verifiable: manualChecklist.length > 0,
      notApplicable,
      checks: scored,
      ...(manualChecklist.length ? { manualChecklist } : {}),
      ...(supportNotices.length ? { supportNotices } : {}),
    });
  }

  const overallScore = totalWeight === 0 ? 100 : Math.round((totalEarned / totalWeight) * 100);
  const priorityFixes = buildPriorityFixes(reportLayers);
  const supportNotices = reportLayers.flatMap((layer) => layer.supportNotices || []);

  return {
    repo,
    defaultBranch,
    scannedAt: new Date().toISOString(),
    overall: { score: overallScore, grade: gradeFor(overallScore) },
    scoring: {
      totalWeight,
      pointsEarned: Math.round(totalEarned),
      pointsLost: Math.round(totalWeight - totalEarned),
      model: 'Each check earns its severity weight: pass=full, warn=half, fail=none. Manual items are informational and excluded.',
    },
    priorityObservations: priorityFixes,
    priorityFixes, // backwards-compatible alias for older dashboard/API consumers
    supportNotices,
    layers: reportLayers,
  };
}

module.exports = { scoreReport, gradeFor };

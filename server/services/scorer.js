const config = require('../config');
const { layers: layerMeta } = require('../checks');

// How much of its weight a check "keeps": pass = all, warn = half, fail = none.
// manual / na / error do not participate (can't be verified -> can't be scored).
const STATUS_FACTOR = { pass: 1, warn: 0.5, fail: 0 };

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
    const checks = [];
    for (const c of rawChecks) {
      if (Array.isArray(c.checklist)) {
        manualChecklist.push(...c.checklist);
        continue; // carrier check is not rendered as a card
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
    });
  }

  const overallScore = totalWeight === 0 ? 100 : Math.round((totalEarned / totalWeight) * 100);

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
    layers: reportLayers,
  };
}

module.exports = { scoreReport, gradeFor };

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scoreReport, gradeFor } = require('../services/scorer');

// Build the runner's shape: Map<layerId, checks[]>.
function report(checks) {
  return scoreReport({ repo: 'x/y', layers: new Map([['frontend', checks]]) });
}
const check = (status, severity, confidence = 'verified', extra = {}) => ({
  id: extra.id || 's',
  label: extra.label || 'Security check',
  status,
  severity,
  confidence,
  ...extra,
});

test('a single passing critical check scores 100 / A', () => {
  const r = report([check('pass', 'critical')]);
  assert.equal(r.overall.score, 100);
  assert.equal(r.overall.grade, 'A');
});

test('a single failing check scores 0 / F', () => {
  const r = report([check('fail', 'critical')]);
  assert.equal(r.overall.score, 0);
  assert.equal(r.overall.grade, 'F');
});

test('a warn earns half its weight', () => {
  const r = report([check('warn', 'critical')]);
  assert.equal(r.overall.score, 50);
});

test('mixes weight by severity (pass critical + fail low)', () => {
  // earned 40 of (40 + 10) = 80%
  const r = report([check('pass', 'critical'), check('fail', 'low')]);
  assert.equal(r.overall.score, 80);
});

test('manual / na checks are excluded from the score', () => {
  // Only the passing critical counts -> 100. The manual medium is informational.
  const r = report([check('pass', 'critical'), check('na', 'medium', 'manual')]);
  assert.equal(r.overall.score, 100);
});

test('an all-manual layer defaults to 100 (nothing to penalize)', () => {
  const r = report([check('na', 'medium', 'manual')]);
  assert.equal(r.overall.score, 100);
});

test('an empty report defaults to 100 with zero scored weight', () => {
  const r = scoreReport({ repo: 'x/y', layers: new Map() });
  assert.equal(r.overall.score, 100);
  assert.equal(r.overall.grade, 'A');
  assert.equal(r.scoring.totalWeight, 0);
  assert.deepEqual(r.layers, []);
});

test('all passing scored checks produce a perfect score', () => {
  const r = report([
    check('pass', 'critical'),
    check('pass', 'high', 'detected'),
    check('pass', 'medium'),
    check('pass', 'low'),
  ]);
  assert.equal(r.overall.score, 100);
  assert.equal(r.overall.grade, 'A');
  assert.equal(r.scoring.pointsLost, 0);
});

test('exposes the "show the math" breakdown', () => {
  const r = report([check('pass', 'critical'), check('fail', 'high')]);
  assert.equal(r.scoring.totalWeight, 65); // 40 + 25
  assert.equal(r.scoring.pointsEarned, 40);
  assert.equal(r.scoring.pointsLost, 25);
});

test('scoreImpact marks counted vs informational checks', () => {
  const r = report([check('fail', 'high'), check('na', 'medium', 'manual')]);
  const [failImpact, manualImpact] = r.layers[0].checks.map((c) => c.scoreImpact);
  assert.equal(failImpact.counted, true);
  assert.equal(failImpact.deduction, 25);
  assert.equal(manualImpact.counted, false);
});

test('priorityFixes lists the highest-impact fixes first', () => {
  const r = scoreReport({
    repo: 'x/y',
    layers: new Map([
      [
        'frontend',
        [
          check('warn', 'critical', 'detected', { id: 'warn-critical', label: 'Critical warning' }),
          check('fail', 'high', 'verified', {
            id: 'fail-high',
            label: 'High verified fail',
            findings: [{ file: 'src/app.js', line: 7, message: 'Fix auth first.' }],
          }),
          check('fail', 'low', 'verified', { id: 'fail-low', label: 'Low fail' }),
          check('pass', 'critical', 'verified', { id: 'pass-critical', label: 'Passing check' }),
        ],
      ],
    ]),
  });

  assert.equal(r.priorityFixes.length, 3);
  assert.equal(r.priorityFixes[0].title, 'Critical warning');
  assert.equal(r.priorityFixes[1].title, 'High verified fail');
  assert.equal(r.priorityFixes[1].why, 'Fix auth first.');
  assert.equal(r.priorityFixes[1].firstFinding.file, 'src/app.js');
  assert.equal(r.priorityFixes.some((fix) => fix.title === 'Passing check'), false);
});

test('gradeFor boundaries', () => {
  assert.equal(gradeFor(90), 'A');
  assert.equal(gradeFor(89), 'B');
  assert.equal(gradeFor(80), 'B');
  assert.equal(gradeFor(70), 'C');
  assert.equal(gradeFor(60), 'D');
  assert.equal(gradeFor(59), 'F');
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scoreReport } = require('../services/scorer');

const check = (id, status, severity, confidence = 'verified') => ({ id, status, severity, confidence });

test('lifts a checklist off its carrier check onto the layer', () => {
  const carrier = {
    id: 'db-manual-checklist',
    status: 'na',
    confidence: 'manual',
    severity: 'critical',
    checklist: [{ id: 'encryption-at-rest', label: 'Encryption at rest', severity: 'critical', why: '...' }],
  };
  const r = scoreReport({
    repo: 'x/y',
    layers: new Map([['database', [check('db-credentials', 'pass', 'critical'), carrier]]]),
  });
  const db = r.layers[0];
  assert.equal(db.manualChecklist.length, 1);
  assert.equal(db.verifiable, true);
  // The carrier is NOT rendered as a normal check card.
  assert.ok(!db.checks.some((c) => c.id === 'db-manual-checklist'));
  // Score reflects only the verifiable check (pass) -> 100.
  assert.equal(db.score, 100);
});

test('marks a layer notApplicable when every check is na and there is no checklist', () => {
  const r = scoreReport({
    repo: 'x/y',
    layers: new Map([['backend', [check('a', 'na', 'high', 'manual'), check('b', 'na', 'medium', 'manual')]]]),
  });
  assert.equal(r.layers[0].notApplicable, true);
});

test('a notApplicable layer contributes zero weight to the overall score', () => {
  const r = scoreReport({
    repo: 'x/y',
    layers: new Map([
      ['frontend', [check('f', 'fail', 'critical')]], // 0/40
      ['backend', [check('b', 'na', 'high', 'manual')]], // excluded
    ]),
  });
  // Overall must equal the frontend-only result (0), not be diluted by backend.
  assert.equal(r.overall.score, 0);
  assert.equal(r.layers[1].notApplicable, true);
});

test('a layer with a checklist is not marked notApplicable', () => {
  const carrier = { id: 'c', status: 'na', confidence: 'manual', severity: 'critical', checklist: [{ id: 'x', label: 'X', severity: 'high', why: '.' }] };
  const r = scoreReport({ repo: 'x/y', layers: new Map([['database', [carrier]]]) });
  assert.equal(r.layers[0].notApplicable, false);
  assert.equal(r.layers[0].verifiable, true);
});

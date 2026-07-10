const { hasDatabase } = require('../../lib/detect');

// The Tier-3 advisory items: the things that matter MOST and that a repo scan
// genuinely cannot see. Emitted as a `checklist`, never scored — the runner
// lifts this onto the layer as `manualChecklist`.
const ITEMS = [
  {
    id: 'encryption-at-rest',
    label: 'Encryption at rest',
    severity: 'critical',
    why: 'Protects stored data if the disk or backup is compromised. Configured in your DB provider (Atlas / RDS / KMS), never in application code.',
  },
  {
    id: 'automated-backups',
    label: 'Automated backups',
    severity: 'high',
    why: 'Enables recovery from data loss, corruption, or ransomware. An operational setting nothing in the repo reveals.',
  },
  {
    id: 'least-privilege-db-user',
    label: 'Least-privilege database user',
    severity: 'high',
    why: 'The app should connect with a user scoped to only the databases/collections it needs — not an admin/root account.',
  },
  {
    id: 'point-in-time-recovery',
    label: 'Point-in-time recovery',
    severity: 'medium',
    why: 'Lets you restore to a moment just before an incident. A provider-level setting, invisible to source.',
  },
];

module.exports = {
  id: 'db-manual-checklist',
  layer: 'database',
  label: 'Confirm these yourself',
  severity: 'critical',
  run(ctx) {
    // Only surface the checklist when there's actually a database in play.
    const checklist = hasDatabase(ctx) ? ITEMS : [];
    return {
      id: 'db-manual-checklist',
      label: 'Confirm these yourself',
      status: 'na',
      confidence: 'manual',
      severity: 'critical',
      findings: [],
      checklist,
    };
  },
};

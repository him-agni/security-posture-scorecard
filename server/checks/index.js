// The check registry. Adding a layer = dropping modules here. Nothing in the
// runner, scorer, or dashboard changed to support Layers 2 & 3 — that sameness
// is the whole point of the plugin pattern.

// Layer 1 — Frontend
const secretsExposed = require('./frontend/secretsExposed');
const clientSecretExposure = require('./frontend/clientSecretExposure');
const typeSafety = require('./frontend/typeSafety');
const inputValidation = require('./frontend/inputValidation');
const routeProtection = require('./frontend/routeProtection');
const depPresence = require('./shared/depPresence');

// Layer 2 — Backend
const authPresent = require('./backend/authPresent');
const passwordHashing = require('./backend/passwordHashing');
const authzChecks = require('./backend/authzChecks');
const rateLimiting = require('./backend/rateLimiting');
const securityHeaders = require('./backend/securityHeaders');
const corsConfig = require('./backend/corsConfig');
const logging = require('./backend/logging');
const vulnerableDeps = require('./backend/vulnerableDeps');

// Layer 3 — Database
const dbCredentials = require('./database/dbCredentials');
const encryptionInTransit = require('./database/encryptionInTransit');
const querySafety = require('./database/querySafety');
const fieldEncryption = require('./database/fieldEncryption');
const schemaValidation = require('./database/schemaValidation');
const dbManualChecklist = require('./database/manualChecklist');

const checks = [
  // frontend
  secretsExposed,
  clientSecretExposure,
  typeSafety,
  depPresence,
  inputValidation,
  routeProtection,
  // backend
  authPresent,
  passwordHashing,
  authzChecks,
  rateLimiting,
  securityHeaders,
  corsConfig,
  logging,
  vulnerableDeps,
  // database
  dbCredentials,
  encryptionInTransit,
  querySafety,
  fieldEncryption,
  schemaValidation,
  dbManualChecklist,
];

// Layer metadata for the report roll-up (order = display order).
const layers = [
  { id: 'frontend', label: 'Frontend', weight: 1 },
  { id: 'backend', label: 'Backend', weight: 1 },
  { id: 'database', label: 'Database', weight: 1 },
];

module.exports = { checks, layers };

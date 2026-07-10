const { projectSupport } = require('../../lib/detect');

module.exports = {
  id: 'project-support',
  layer: 'frontend',
  label: 'Project support',
  severity: 'medium',
  run(ctx) {
    const support = projectSupport(ctx);
    return {
      id: 'project-support',
      label: 'Project support',
      status: support.supported ? 'na' : 'warn',
      confidence: support.primaryLanguage === 'Unknown' ? 'manual' : 'detected',
      severity: 'medium',
      support,
      findings: support.message ? [{ message: support.message }] : [],
    };
  },
};

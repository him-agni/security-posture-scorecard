const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeFixture } = require('./helpers');
const { runScan } = require('../services/scanRunner');
const { scoreReport } = require('../services/scorer');

async function reportFor(files) {
  const { ctx, cleanup } = makeFixture(files);
  try {
    const layers = await runScan({ rootDir: ctx.rootDir });
    return scoreReport({ repo: 'x/y', layers });
  } finally {
    cleanup();
  }
}

test('states Python repos are outside the current Node/JS support target', async () => {
  const report = await reportFor({
    'pyproject.toml': '[project]\nname = "api"\n',
    'app/main.py': 'print("hello")\n',
  });
  assert.equal(report.supportNotices[0].message, 'This looks like a Python project — this scanner currently supports Node/JS repos.');
});

test('states Java repos are outside the current Node/JS support target', async () => {
  const report = await reportFor({
    'pom.xml': '<project></project>\n',
    'src/main/java/App.java': 'class App {}\n',
  });
  assert.equal(report.supportNotices[0].message, 'This looks like a Java project — this scanner currently supports Node/JS repos.');
});

test('does not show a support notice for Node/JS repos', async () => {
  const report = await reportFor({
    'package.json': '{"name":"node-app","dependencies":{"express":"^4"}}',
    'src/index.js': 'console.log("ok");\n',
  });
  assert.deepEqual(report.supportNotices, []);
});

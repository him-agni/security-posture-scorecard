const path = require('path');
const fs = require('fs');
const config = require('../config');

// --- tiny glob -> regex (supports **, *, ?, and {a,b} brace expansion) ---
function expandBraces(pattern) {
  const m = pattern.match(/\{([^{}]+)\}/);
  if (!m) return [pattern];
  const [full, inner] = m;
  return inner
    .split(',')
    .flatMap((opt) => expandBraces(pattern.replace(full, opt)));
}

function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // ** matches across directory separators
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++; // swallow the slash after **
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}

function walk(rootDir) {
  const files = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (config.ignoredDirs.includes(entry.name)) continue;
        stack.push(path.join(dir, entry.name));
      } else if (entry.isFile()) {
        if (config.ignoredFiles.includes(entry.name)) continue;
        // store repo-relative POSIX path
        const rel = path.relative(rootDir, path.join(dir, entry.name)).split(path.sep).join('/');
        files.push(rel);
      }
    }
  }
  return files;
}

/**
 * Build the ctx object every check receives. One filesystem walk, cached.
 */
function buildContext(rootDir) {
  const allFiles = walk(rootDir);

  const readFile = (rel) => {
    try {
      return fs.readFileSync(path.join(rootDir, rel), 'utf8');
    } catch {
      return null;
    }
  };

  const fileExists = (rel) => allFiles.includes(rel.split(path.sep).join('/'));

  const glob = (pattern) => {
    const regexes = expandBraces(pattern).map(globToRegExp);
    return allFiles.filter((f) => regexes.some((r) => r.test(f)));
  };

  // Parse root package.json once (best-effort).
  let manifest = null;
  const pkgRaw = readFile('package.json');
  if (pkgRaw) {
    try {
      manifest = JSON.parse(pkgRaw);
    } catch {
      manifest = null;
    }
  }

  // Merged dependency map (deps + devDeps) — used by most Layer 2/3 checks.
  const deps = { ...(manifest?.dependencies || {}), ...(manifest?.devDependencies || {}) };

  // Lazy, cached list of JS/TS-ish source files + a line-level grep over them.
  const SOURCE_GLOB = '**/*.{js,jsx,ts,tsx,mjs,cjs,vue,svelte}';
  let _sourceCache = null;
  const sourceFiles = () => (_sourceCache ||= glob(SOURCE_GLOB));

  // grep(regex) -> [{ file, line, text }]. Pass a NON-global regex.
  const grep = (regex, files) => {
    const out = [];
    for (const f of files || sourceFiles()) {
      const c = readFile(f);
      if (c == null) continue;
      const lines = c.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].length <= 4000 && regex.test(lines[i])) {
          out.push({ file: f, line: i + 1, text: lines[i].trim().slice(0, 200) });
        }
      }
    }
    return out;
  };

  // hasDep('express', 'fastify', ...) -> the first dependency name that is present.
  const hasDep = (...names) => names.find((n) => deps[n]);

  return { rootDir, allFiles, readFile, fileExists, glob, manifest, deps, sourceFiles, grep, hasDep };
}

module.exports = { buildContext, globToRegExp, expandBraces };

// Decides whether a repo actually HAS a backend / database surface. If it
// doesn't, the corresponding layer is marked not-applicable rather than being
// warned to death — a frontend-only repo shouldn't fail "no rate limiting".

const BACKEND_DEPS = [
  'express', 'fastify', 'koa', '@nestjs/core', '@hapi/hapi', 'hapi', 'restify',
  'apollo-server', '@apollo/server', 'graphql-yoga', 'next', 'nuxt', 'micro',
  'http-errors', 'body-parser', 'ws', 'socket.io',
];
const BACKEND_CODE = /\b(require\(['"](express|fastify|koa|http|https)['"]\)|from\s+['"](express|fastify|koa)['"]|http\.createServer|https\.createServer|fastify\(|new\s+Koa\()/;

const DB_DEPS = [
  'mongoose', 'mongodb', 'pg', 'pg-promise', 'mysql', 'mysql2', 'sqlite3',
  'better-sqlite3', 'prisma', '@prisma/client', 'typeorm', 'sequelize',
  'knex', 'drizzle-orm', 'redis', 'ioredis', 'cassandra-driver', 'firebase-admin',
  '@supabase/supabase-js', 'mssql', 'oracledb',
];
const DB_CODE = /(mongodb(\+srv)?:\/\/|postgres(ql)?:\/\/|mysql:\/\/|new\s+Sequelize|createConnection|mongoose\.connect|new\s+Pool\(|PrismaClient|DATABASE_URL|MONGO_URI|MONGODB_URI)/;

function detectBackend(ctx) {
  if (BACKEND_DEPS.some((d) => ctx.deps[d])) return true;
  // Next/Nuxt api routes or a src/server/api folder also imply backend surface.
  if (ctx.glob('**/{api,pages/api,app/api,routes,controllers,server}/**/*.{js,ts}').length) return true;
  return ctx.grep(BACKEND_CODE).length > 0;
}

function detectDatabase(ctx) {
  if (DB_DEPS.some((d) => ctx.deps[d])) return true;
  if (ctx.fileExists('prisma/schema.prisma')) return true;
  return ctx.grep(DB_CODE).length > 0;
}

// Cache the result on ctx so every check in the layer doesn't recompute it.
function hasBackend(ctx) {
  if (ctx._hasBackend === undefined) ctx._hasBackend = detectBackend(ctx);
  return ctx._hasBackend;
}
function hasDatabase(ctx) {
  if (ctx._hasDatabase === undefined) ctx._hasDatabase = detectDatabase(ctx);
  return ctx._hasDatabase;
}

// Shared "this layer doesn't apply here" result.
function notApplicable(id, label, severity, layer, reason) {
  return { id, label, status: 'na', confidence: 'manual', severity, findings: [{ message: reason }] };
}

module.exports = { hasBackend, hasDatabase, notApplicable };

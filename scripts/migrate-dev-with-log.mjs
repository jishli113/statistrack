#!/usr/bin/env node
/**
 * Wraps `prisma migrate dev` and posts NDJSON checkpoints for debug session e97b16.
 * Usage: node scripts/migrate-dev-with-log.mjs -- --name my_migration
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const ENDPOINT = 'http://127.0.0.1:7645/ingest/dd7520f7-f070-4459-993e-c235e8ec3533'
const SESSION = 'e97b16'

function log(message, data, hypothesisId) {
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION },
    body: JSON.stringify({
      sessionId: SESSION,
      location: 'scripts/migrate-dev-with-log.mjs',
      message,
      data: data ?? {},
      timestamp: Date.now(),
      runId: 'migrate-directurl',
      hypothesisId: hypothesisId ?? 'H2',
    }),
  }).catch(() => {})
}

const hasDirect = !!process.env.DIRECT_URL?.length
const hasDb = !!process.env.DATABASE_URL?.length
log('migrate_dev_wrapper_start', { hasDirectUrl: hasDirect, hasDatabaseUrl: hasDb }, 'H2')

const extraArgs = process.argv.slice(2).filter((a) => a !== '--')
const child = spawn('npx', ['prisma', 'migrate', 'dev', ...extraArgs], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

child.on('error', (err) => {
  log('migrate_dev_spawn_error', { err: String(err.message) }, 'H2')
  process.exit(1)
})

child.on('close', (code, signal) => {
  log('migrate_dev_exit', { code, signal }, 'H2')
  process.exit(code ?? 1)
})

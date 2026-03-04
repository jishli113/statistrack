import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// #region agent log
const dbUrl = process.env.DATABASE_URL || '';
const hasSsl = dbUrl.includes('sslmode') || dbUrl.includes('ssl=true');
const hasPgbouncer = dbUrl.includes('pgbouncer');
fetch('http://127.0.0.1:7645/ingest/0076e394-aa9d-4240-963d-3a0498b811e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'22dd7a'},body:JSON.stringify({sessionId:'22dd7a',location:'lib/prisma.ts:12',message:'DATABASE_URL format check',data:{hasDatabaseUrl:!!process.env.DATABASE_URL,urlLength:process.env.DATABASE_URL?.length||0,urlPrefix:process.env.DATABASE_URL?.substring(0,30)||'undefined',hasSsl,hasPgbouncer,hasQueryParams:dbUrl.includes('?'),nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),runId:'initial',hypothesisId:'D'})}).catch(()=>{});
// #endregion

// Singleton pattern for Prisma Client
// Prevents multiple instances in serverless environments (Vercel + Supabase)
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// #region agent log
// Test connection on initialization
prisma.$connect().then(() => {
  fetch('http://127.0.0.1:7645/ingest/0076e394-aa9d-4240-963d-3a0498b811e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'22dd7a'},body:JSON.stringify({sessionId:'22dd7a',location:'lib/prisma.ts:25',message:'Prisma connection successful',data:{connected:true},timestamp:Date.now(),runId:'initial',hypothesisId:'E'})}).catch(()=>{});
}).catch((err: any) => {
  fetch('http://127.0.0.1:7645/ingest/0076e394-aa9d-4240-963d-3a0498b811e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'22dd7a'},body:JSON.stringify({sessionId:'22dd7a',location:'lib/prisma.ts:28',message:'Prisma connection failed',data:{error:err?.message||'unknown',errorCode:err?.code||'unknown'},timestamp:Date.now(),runId:'initial',hypothesisId:'E'})}).catch(()=>{});
});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7645/ingest/0076e394-aa9d-4240-963d-3a0498b811e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'22dd7a'},body:JSON.stringify({sessionId:'22dd7a',location:'lib/prisma.ts:20',message:'Prisma Client created',data:{isNewInstance:!globalForPrisma.prisma,hasDatabaseUrl:!!process.env.DATABASE_URL},timestamp:Date.now(),runId:'initial',hypothesisId:'C'})}).catch(()=>{});
// #endregion

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

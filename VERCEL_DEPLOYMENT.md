# Vercel Deployment Guide for Supabase

## Setting Up Environment Variables in Vercel

### Step 1: Get Your Supabase Connection Strings

You need **two different connection strings** from Supabase:

1. **Direct Connection (Session mode)** - For migrations and Prisma operations
2. **Pooled Connection (Transaction mode)** - For application runtime (API routes)

#### Getting the Connection Strings:

1. Go to your Supabase project → **Settings** → **Database**
2. Scroll to **Connection string** section
3. You'll see three modes:
   - **Session mode** - Direct connection (use for migrations)
   - **Transaction mode** - Pooled connection (use for app runtime)
   - **URI** - Basic connection string

### Step 2: Configure Vercel Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

#### For Production:

- **`DATABASE_URL`**: Use the **Session mode** (direct) connection string
  - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
  - Replace `[PASSWORD]` with your database password (URL-encode special characters)
  - **Important**: Don't include `?pgbouncer=true` for migrations

- **`NEXTAUTH_URL`**: Your Vercel deployment URL
  - Example: `https://your-app.vercel.app`

- **`NEXTAUTH_SECRET`**: Generate with:
  ```bash
  openssl rand -base64 32
  ```

#### Optional: Separate Runtime Connection

If you want to use the pooled connection for runtime (better for serverless), you can:

1. Set `DATABASE_URL` to the direct connection (for migrations)
2. Create a separate `DATABASE_URL_RUNTIME` with the pooled connection
3. Update your Prisma client to use `DATABASE_URL_RUNTIME` for runtime

### Step 3: URL Encoding Special Characters

If your Supabase password contains special characters, you must URL-encode them:

- `@` → `%40`
- `&` → `%26`
- `$` → `%24`
- `#` → `%23`
- `%` → `%25`

**Example:**
- Password: `d.tK@3&cR.jdi$#`
- Encoded: `d.tK%403%26cR.jdi%24%23`

### Step 4: Deploy

After setting environment variables:

1. Push your code to GitHub
2. Vercel will automatically trigger a new deployment
3. The build will:
   - Generate Prisma Client
   - Push schema to database (`prisma db push`)
   - Build your Next.js app

## Troubleshooting

### "Can't reach database server" Error

**Causes:**
- Using pooled connection (`pgbouncer=true`) for migrations
- Incorrect `DATABASE_URL` format
- Network restrictions
- Missing environment variable

**Solutions:**
1. Ensure `DATABASE_URL` uses **Session mode** (direct connection) without `pgbouncer=true`
2. Verify the connection string is correctly URL-encoded
3. Check that the environment variable is set in Vercel
4. Try using `prisma db push` instead of `prisma migrate deploy` (already configured)

### Migration Errors

If migrations fail, you can:

1. **Run migrations manually** before deployment:
   ```bash
   npx prisma migrate deploy
   ```

2. **Use `prisma db push`** (already configured in `vercel.json`):
   - This syncs your schema without requiring migration files
   - Good for initial setup and development

3. **Check Supabase logs** in your project dashboard for connection issues

### Connection Pooling for Runtime

For better performance in production, consider using connection pooling for your API routes. The current setup uses the direct connection for both migrations and runtime, which works but isn't optimal for high-traffic scenarios.

To use pooling for runtime:
1. Set `DATABASE_URL` to direct connection (for migrations)
2. Create `DATABASE_URL_RUNTIME` with pooled connection
3. Update `lib/prisma.ts` to use `DATABASE_URL_RUNTIME` when available

## Alternative: Manual Migration Setup

If automatic migrations continue to fail:

1. **Run migrations locally** before deploying:
   ```bash
   # Set DATABASE_URL to your Supabase direct connection
   export DATABASE_URL="postgresql://postgres:password@db.project.supabase.co:5432/postgres"
   npx prisma migrate deploy
   ```

2. **Remove migration step from build**:
   - Update `vercel.json` to: `"buildCommand": "prisma generate && next build"`
   - Run migrations manually or via a separate process

3. **Use Supabase migrations**:
   - Run SQL directly in Supabase SQL Editor
   - Use the migration SQL from `prisma/migrations/*/migration.sql`

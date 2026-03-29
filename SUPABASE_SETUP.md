# Supabase Setup Guide

This guide will help you set up Supabase for StatisTrack.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up or log in
2. Click **"New Project"**
3. Fill in:
   - **Name**: Your project name (e.g., "statistrack")
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click **"Create new project"** and wait for it to be ready (~2 minutes)

## Step 2: Get Your Database Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to the **Connection string** section
3. Select the **URI** tab (not Session mode or Transaction mode)
4. Copy the connection string - it will look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your database password (the one you set when creating the project)
   - **Important**: If your password contains special characters (`@`, `&`, `$`, `#`, `%`, etc.), you must URL-encode them:
     - `@` → `%40`
     - `&` → `%26`
     - `$` → `%24`
     - `#` → `%23`
     - `%` → `%25`
     - Or use an online URL encoder tool
6. **For Vercel/serverless deployment**, add connection pooling parameters:
   ```
   postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
   ```

## Step 3: Configure Environment Variables

### Local Development (.env)

Create a `.env` file in your project root:

```env
DATABASE_URL="postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

### Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - `DATABASE_URL`: Your Supabase connection string (with pooling parameters)
   - `NEXTAUTH_URL`: Your Vercel app URL (e.g., `https://your-app.vercel.app`)
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`

## Step 4: Run Database Migrations

After setting up your connection string:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to create tables
npx prisma migrate deploy
```

**Important**: For migrations, you may need to use the **direct connection** (without `pgbouncer=true`) instead of the pooled connection. 

- **Pooled connection** (with `pgbouncer=true`): Use for application runtime (API routes, serverless functions)
- **Direct connection** (without `pgbouncer=true`): Use for migrations and Prisma Studio

You can temporarily switch your `DATABASE_URL` in `.env` to the direct connection for migrations, or use Supabase's "Session" mode connection string from Settings → Database.

For local development, you can use:
```bash
npx prisma migrate dev
```

## Step 5: Verify Connection

You can verify your connection works by running:

```bash
npx prisma studio
```

This opens a visual database browser where you can see your tables.

## Connection Pooling (Important for Serverless)

Supabase uses connection pooling to handle serverless environments efficiently. The connection string with `?pgbouncer=true&connection_limit=1` is optimized for:
- Vercel serverless functions
- Next.js API routes
- High concurrency scenarios

**Note**: Always use the pooled connection string for production deployments on Vercel.

## Troubleshooting

### Connection Timeout
- Make sure you're using the pooled connection string (`pgbouncer=true`)
- Check that your IP is allowed in Supabase (Settings → Database → Connection pooling)

### Migration Errors
- Ensure your `DATABASE_URL` is correct
- Verify you have the correct database password
- Check that Prisma migrations are committed to your repository

### SSL Errors
- Supabase requires SSL connections
- The connection string should automatically include SSL parameters
- If issues persist, add `?sslmode=require` to your connection string

### Connection String Parsing Errors
- If you see errors like "Can't reach database server at `[password-part]:5432`", your password likely contains special characters that need URL encoding
- Common special characters that need encoding: `@`, `&`, `$`, `#`, `%`
- Use an online URL encoder or encode manually (e.g., `@` becomes `%40`)

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Prisma with Supabase](https://supabase.com/docs/guides/integrations/prisma)
- [Connection Pooling Guide](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

# OAuth Setup Guide

This guide will help you set up OAuth authentication (Google and GitHub) for your Job Application Tracker.

## Prerequisites

- Database migration completed (Account, Session, VerificationToken tables)
- OAuth provider accounts (Google Cloud Console, GitHub)

## Step 1: Database Migration

Run the migration to create OAuth tables:

```bash
npx prisma db push --accept-data-loss
```

Or create a migration:

```bash
npx prisma migrate dev --name add_oauth_support
```

**Note:** Make sure your Supabase database is active (not paused) before running migrations.

## Step 2: Google OAuth Setup

### 2.1 Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - User Type: External
   - App name: Job Application Tracker
   - Support email: your email
   - Authorized domains: (leave empty for localhost)
   - Scopes: email, profile, openid (default)
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: Job Tracker (or any name)
   - **Authorized redirect URIs**: 
     - `http://localhost:3002/api/auth/callback/google`
     - `https://your-domain.vercel.app/api/auth/callback/google` (for production)
7. Copy the **Client ID** and **Client Secret**

### 2.2 Add to Environment Variables

Add to your `.env` file:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Step 3: GitHub OAuth Setup

### 3.1 Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: Job Application Tracker
   - **Homepage URL**: `http://localhost:3002` (or your production URL)
   - **Authorization callback URL**: 
     - `http://localhost:3002/api/auth/callback/github`
     - `https://your-domain.vercel.app/api/auth/callback/github` (for production)
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy it

### 3.2 Add to Environment Variables

Add to your `.env` file:

```env
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Step 4: Verify Configuration

Your `.env` file should have:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Step 5: Test OAuth

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Go to `http://localhost:3002`

3. Click "Continue with Google" or "Continue with GitHub"

4. You should be redirected to the provider's login page

5. After authentication, you'll be redirected back and logged in

## Troubleshooting

### "Can't reach database server"
- Make sure your Supabase database is active (not paused)
- Check your `DATABASE_URL` connection string
- Verify SSL parameters if needed

### "OAuth account not linked"
- Make sure the redirect URI matches exactly in your OAuth provider settings
- Check that `NEXTAUTH_URL` matches your app URL

### "Invalid client"
- Verify your Client ID and Secret are correct
- Make sure there are no extra spaces in `.env` file
- Restart your dev server after changing `.env`

## Production Setup

For Vercel deployment:

1. Add all environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (your Vercel URL)
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`

2. Update OAuth provider redirect URIs to include your production URL:
   - `https://your-app.vercel.app/api/auth/callback/google`
   - `https://your-app.vercel.app/api/auth/callback/github`

3. Redeploy your app

## How It Works

- **OAuth Sign-In**: User clicks OAuth button → Redirected to provider → Authenticates → Redirected back → Account created/linked automatically
- **Email/Password**: User signs up with email/password → Account created → Can also link OAuth later
- **Account Linking**: If a user signs in with email/password first, then uses OAuth with the same email, the accounts are automatically linked

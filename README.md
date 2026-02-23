# Job Application Tracker

A modern web application for tracking job applications and their status, built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🔐 User authentication (sign up/sign in)
- 📊 Dashboard with application statistics
- ➕ Add, edit, and delete job applications
- 📱 Responsive design
- 🎨 Modern UI with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: Supabase (PostgreSQL) with Prisma ORM
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (local or cloud)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd job-app-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add:
- `DATABASE_URL`: Your Supabase PostgreSQL connection string (see Supabase setup below)
- `NEXTAUTH_SECRET`: Generate one with `openssl rand -base64 32`
- `NEXTAUTH_URL`: `http://localhost:3000` for local development

4. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

**Important**: Make sure to commit and push the migration files created in `prisma/migrations/` to your repository before deploying.

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Supabase Setup

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

**Quick setup:**
1. Create a project at [supabase.com](https://supabase.com)
2. Get your connection string from **Settings** → **Database** → **Connection string (URI)**
3. Add `?pgbouncer=true&connection_limit=1` for serverless/connection pooling
4. Add it to your `.env` file as `DATABASE_URL`

### Local PostgreSQL Setup (Alternative)

If you prefer to use a local PostgreSQL database for development:

**Option 1: Docker (Recommended)**
```bash
docker run --name jobtracker-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=jobtracker -p 5432:5432 -d postgres
```

**Option 2: Install PostgreSQL locally**
- Install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)
- Create a database: `createdb jobtracker`
- Use connection string: `postgresql://your_username:your_password@localhost:5432/jobtracker?schema=public`

## Deployment to Vercel

1. Push your code to GitHub

2. Import your repository in Vercel

3. **Add environment variables in Vercel dashboard:**
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string (from Supabase Settings → Database)
   - `NEXTAUTH_URL`: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
   - `NEXTAUTH_SECRET`: A secure random string (generate with `openssl rand -base64 32`)

4. **Deploy!** The build will automatically:
   - Generate Prisma Client
   - Run database migrations
   - Build your Next.js app

**Note**: Make sure to use the connection pooling URL from Supabase (with `?pgbouncer=true&connection_limit=1`) for better performance with serverless functions.

## Project Structure

```
job-app-tracker/
├── app/
│   ├── api/          # API routes
│   ├── globals.css   # Global styles
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Home page
├── components/       # React components
├── prisma/          # Prisma schema and migrations
└── public/          # Static assets
```

## License

MIT

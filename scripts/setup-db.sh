#!/bin/bash
# Database setup script for Supabase
# Run this manually before deploying to Vercel, or use it in a GitHub Action

set -e

echo "Generating Prisma Client..."
npx prisma generate

echo "Pushing database schema..."
npx prisma db push --accept-data-loss

echo "Database setup complete!"

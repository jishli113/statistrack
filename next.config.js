/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Avoid bundling Prisma into server chunks (can duplicate clients in dev and confuse PgBouncer)
  serverExternalPackages: ['@prisma/client'],
}

module.exports = nextConfig

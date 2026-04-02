import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // CLI (migrate, introspect, etc.) needs a direct Postgres connection — not the transaction pooler.
    url: env('DIRECT_URL'),
  },
})

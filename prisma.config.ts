// prisma.config.ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // where your schema lives
  schema: 'prisma/schema.prisma',

  // where migrations will be stored
  migrations: {
    path: 'prisma/migrations',
  },

  // this replaces `url = env("DATABASE_URL")` in schema.prisma
  datasource: {
    url: env('DATABASE_URL'),
  },
});
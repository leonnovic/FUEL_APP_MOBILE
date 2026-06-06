import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // For local development, use SQLite file
  if (process.env.NODE_ENV === 'development' && !process.env.TURSO_DATABASE_URL) {
    return new PrismaClient({
      log: ['query'],
    })
  }

  // For production (Vercel) with Turso
  const libsql = createClient({
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./prisma/db/custom.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  const adapter = new PrismaLibSql(libsql)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
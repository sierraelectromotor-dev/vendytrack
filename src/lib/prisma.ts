import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    "";

  if (!connectionString) {
    return new PrismaClient();
  }

  const pool = globalForPrisma.pgPool ?? new Pool({
    connectionString,
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => { console.error('[PrismaPool] Error inesperado:', err); });

  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
export default prisma;

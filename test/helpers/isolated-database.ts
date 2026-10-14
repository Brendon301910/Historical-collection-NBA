import { execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../src/infra/database/prisma/prisma.service';

export async function createIsolatedDatabase() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error(
      'Set TEST_DATABASE_URL to a dedicated PostgreSQL test database',
    );
  }
  const schema = 'nba_history_test_' + randomUUID().replace(/-/g, '');
  const url = new URL(testUrl);
  url.searchParams.set('schema', schema);
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  let prisma: PrismaService | undefined;
  let created = false;
  const close = async () => {
    try {
      await prisma?.$disconnect();
      if (created) {
        // The identifier is generated locally, never supplied by an environment variable.
        await admin.$executeRawUnsafe('DROP SCHEMA "' + schema + '" CASCADE');
      }
    } finally {
      await admin.$disconnect();
    }
  };
  try {
    await admin.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
    created = true;
    execFileSync(
      process.execPath,
      [resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'],
      {
        env: { ...process.env, DATABASE_URL: url.toString() },
        stdio: 'pipe',
        timeout: 30000,
      },
    );
    prisma = new PrismaService({
      datasources: { db: { url: url.toString() } },
    });
    return { prisma, close };
  } catch (error) {
    await close();
    throw error;
  }
}

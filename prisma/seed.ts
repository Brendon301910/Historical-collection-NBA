import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedPlayers } from './seed-players';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const result = await seedPlayers(prisma);
    console.log(
      `NBA 75: ${result.created} criados, ${result.linked} vinculados, ` +
        `${result.unchanged} preservados.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});

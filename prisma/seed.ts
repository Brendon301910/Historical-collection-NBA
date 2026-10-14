import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedHistory } from './seed-history';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const result = await seedHistory(prisma);
    console.log(
      `Jogadores: ${result.players.created} criados, ${result.players.linked} vinculados, ` +
        `${result.players.unchanged} preservados. ` +
        `Histórico verificado: ${result.winners} conquistas, ${result.championships} finais, ` +
        `${result.teams} times e ${result.seasons} temporadas.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});

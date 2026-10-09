import { PrismaClient } from '@prisma/client';
import { loadPlayerCatalog } from './player-catalog';

export interface SeedPlayersResult {
  created: number;
  linked: number;
  unchanged: number;
}

function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export async function seedPlayers(
  prisma: PrismaClient,
): Promise<SeedPlayersResult> {
  const catalog = loadPlayerCatalog();

  return prisma.$transaction(
    async (transaction) => {
      // Serialize seed executions across CLI processes without locking the API.
      await transaction.$queryRaw`
        SELECT 1 AS locked FROM pg_advisory_xact_lock(750076)
      `;

      const existing = await transaction.player.findMany({
        select: { id: true, nba_id: true, name: true, year_of_birth: true },
      });
      const result: SeedPlayersResult = { created: 0, linked: 0, unchanged: 0 };

      for (const player of catalog) {
        if (existing.some((row) => row.nba_id === player.nbaId)) {
          result.unchanged++;
          continue;
        }

        const matches = existing.filter(
          (row) => normalizeName(row.name) === normalizeName(player.name),
        );
        if (
          matches.length > 1 ||
          (matches.length === 1 &&
            (matches[0].nba_id !== null ||
              matches[0].year_of_birth !== player.yearOfBirth))
        ) {
          throw new Error(
            `Conciliação necessária para ${player.name} (NBA ${player.nbaId}). ` +
              `Revise os registros: ${matches
                .map((row) => row.id)
                .join(', ')}. ` +
              'A carga foi cancelada sem gravar alterações.',
          );
        }

        if (matches.length === 1) {
          // Preserve the local ID, user edits, timestamps and soft deletion.
          await transaction.player.update({
            where: { id: matches[0].id },
            data: { nba_id: player.nbaId },
          });
          result.linked++;
          continue;
        }

        if (existing.some((row) => row.id === player.id)) {
          throw new Error(
            `O ID reservado para ${player.name} já pertence a outro cadastro. ` +
              'A carga foi cancelada sem gravar alterações.',
          );
        }

        await transaction.player.upsert({
          where: { nba_id: player.nbaId },
          update: {},
          create: {
            id: player.id,
            nba_id: player.nbaId,
            name: player.name,
            height: player.height,
            year_of_birth: player.yearOfBirth,
          },
        });
        result.created++;
      }

      return result;
    },
    { maxWait: 10000, timeout: 60000 },
  );
}

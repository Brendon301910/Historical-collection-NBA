import { PrismaClient } from '@prisma/client';
import { loadHistoryCatalog } from './history-catalog';
import { lockSeed, seedPlayersInTransaction } from './seed-players';

function assertCompatible(
  saved: object,
  expected: Record<string, string | number>,
  description: string,
): void {
  for (const [field, value] of Object.entries(expected)) {
    if (saved[field] !== value) {
      throw new Error(
        'Divergência em ' +
          description +
          ' (' +
          field +
          '). Revise o registro; a carga foi revertida.',
      );
    }
  }
}

export async function seedHistory(prisma: PrismaClient) {
  const catalog = loadHistoryCatalog();
  return prisma.$transaction(
    async (transaction) => {
      await lockSeed(transaction);
      const players = await seedPlayersInTransaction(
        transaction,
        catalog.players,
      );
      const teamIds = new Map<string, string>();
      const awardIds = new Map<string, string>();
      const seasonIds = new Map<number, string>();
      for (const row of catalog.teams) {
        const saved = await transaction.team.upsert({
          where: { code: row.code },
          update: {},
          create: { id: row.id, code: row.code, name: row.name },
        });
        assertCompatible(saved, { name: row.name }, 'time ' + row.code);
        teamIds.set(row.code, saved.id);
      }
      for (const row of catalog.awards) {
        const saved = await transaction.award.upsert({
          where: { code: row.code },
          update: {},
          create: { id: row.id, code: row.code, name: row.name },
        });
        assertCompatible(saved, { name: row.name }, 'prêmio ' + row.code);
        awardIds.set(row.code, saved.id);
      }
      for (const row of catalog.seasons) {
        const saved = await transaction.season.upsert({
          where: { end_year: row.endYear },
          update: {},
          create: {
            id: row.id,
            start_year: row.startYear,
            end_year: row.endYear,
          },
        });
        assertCompatible(
          saved,
          { start_year: row.startYear },
          'temporada ' + row.endYear,
        );
        seasonIds.set(row.endYear, saved.id);
      }
      // Manual reconciliation can preserve a UUID different from the JSON UUID.
      const storedPlayers = await transaction.player.findMany({
        where: { nba_id: { in: catalog.players.map((p) => p.nbaId) } },
        select: { id: true, nba_id: true },
      });
      const playerIds = new Map(storedPlayers.map((p) => [p.nba_id, p.id]));
      for (const row of catalog.winners) {
        const key = {
          award_id: awardIds.get(row.award),
          season_id: seasonIds.get(row.year),
          player_id: playerIds.get(row.playerNbaId),
        };
        const expected = {
          ...key,
          team_id: teamIds.get(row.team),
          source_url: row.sourceUrl,
        };
        const saved = await transaction.award_winner.upsert({
          where: { award_id_season_id_player_id: key },
          update: {},
          create: { id: row.id, ...expected },
        });
        assertCompatible(
          saved,
          expected,
          row.award + ' ' + row.year + ' jogador NBA ' + row.playerNbaId,
        );
      }
      for (const row of catalog.championships) {
        const expected = {
          season_id: seasonIds.get(row.year),
          champion_team_id: teamIds.get(row.champion),
          runner_up_team_id: teamIds.get(row.runnerUp),
          champion_wins: row.championWins,
          runner_up_wins: row.runnerUpWins,
          source_url: row.sourceUrl,
        };
        const saved = await transaction.championship.upsert({
          where: { season_id: expected.season_id },
          update: {},
          create: { id: row.id, ...expected },
        });
        assertCompatible(saved, expected, 'final ' + row.year);
      }
      return {
        players,
        awards: catalog.awards.length,
        teams: catalog.teams.length,
        seasons: catalog.seasons.length,
        winners: catalog.winners.length,
        championships: catalog.championships.length,
      };
    },
    { maxWait: 10000, timeout: 60000 },
  );
}

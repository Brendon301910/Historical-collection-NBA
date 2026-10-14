import { z } from 'zod';
import * as history from './data/history.json';
import * as additional from './data/additional-players.json';
import { loadPlayerCatalog, playerSchema } from './player-catalog';

const id = z.string().uuid();
const year = z.number().int().min(1947).max(9999);
const code = z.string().regex(/^[A-Z][A-Z0-9_-]{1,31}$/);
const sourceUrl = z
  .string()
  .url()
  .regex(/^https:\/\/www\.nba\.com\//);
const coverage = z
  .object({
    fromYear: year,
    throughYear: year,
    sourceUrl,
  })
  .strict()
  .refine((value) => value.fromYear <= value.throughYear, 'Invalid coverage');

export const historySchema = z
  .object({
    verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    championshipCoverage: coverage,
    awards: z
      .array(
        z
          .object({
            id,
            code,
            name: z.string().min(1),
            fromYear: year,
            throughYear: year,
            sourceUrl,
          })
          .strict(),
      )
      .min(1),
    seasons: z
      .array(
        z
          .object({
            id,
            startYear: z.number().int().min(1946).max(9998),
            endYear: year,
          })
          .strict()
          .refine((s) => s.endYear === s.startYear + 1, 'Invalid season'),
      )
      .min(1),
    teams: z
      .array(z.object({ id, code, name: z.string().min(1) }).strict())
      .min(1),
    winners: z
      .array(
        z
          .object({
            id,
            award: code,
            year,
            playerNbaId: z.number().int().positive(),
            team: code,
            sourceUrl,
          })
          .strict(),
      )
      .min(1),
    championships: z
      .array(
        z
          .object({
            id,
            year,
            champion: code,
            runnerUp: code,
            championWins: z.literal(4),
            runnerUpWins: z.number().int().min(0).max(3),
            sourceUrl,
          })
          .strict()
          .refine(
            (c) => c.champion !== c.runnerUp,
            'Champion and runner-up must differ',
          ),
      )
      .min(1),
  })
  .strict();

const additionalSchema = z
  .object({
    verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    players: z.array(playerSchema),
  })
  .strict();

function unique(values: (string | number)[], description: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error('Duplicação no catálogo: ' + description);
  }
}

function requireReference(condition: boolean, description: string): void {
  if (!condition)
    throw new Error('Catálogo histórico inválido: ' + description);
}

// All validation happens before opening the seed transaction.
export function loadHistoryCatalog(
  historyInput: unknown = history,
  additionalInput: unknown = additional,
) {
  const catalog = historySchema.parse(historyInput);
  const players = [
    ...loadPlayerCatalog(),
    ...additionalSchema.parse(additionalInput).players,
  ];
  unique(
    players.map((p) => p.id),
    'player.id',
  );
  unique(
    players.map((p) => p.nbaId),
    'player.nbaId',
  );
  unique(
    players.map((p) =>
      p.name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ''),
    ),
    'player.name',
  );
  for (const collection of [catalog.awards, catalog.teams]) {
    unique(
      collection.map((row) => row.id),
      'id',
    );
    unique(
      collection.map((row) => row.code),
      'code',
    );
  }
  unique(
    catalog.seasons.map((s) => s.id),
    'season.id',
  );
  unique(
    catalog.seasons.map((s) => s.endYear),
    'season.endYear',
  );
  unique(
    catalog.winners.map((w) => w.id),
    'winner.id',
  );
  unique(
    catalog.winners.map((w) => [w.award, w.year, w.playerNbaId].join(':')),
    'winner',
  );
  unique(
    catalog.championships.map((c) => c.id),
    'championship.id',
  );
  unique(
    catalog.championships.map((c) => c.year),
    'championship.year',
  );

  const teams = new Set(catalog.teams.map((t) => t.code));
  const seasons = new Set(catalog.seasons.map((s) => s.endYear));
  const playerIds = new Set(players.map((p) => p.nbaId));
  for (const winner of catalog.winners) {
    const award = catalog.awards.find((a) => a.code === winner.award);
    requireReference(!!award, 'prêmio ' + winner.award);
    requireReference(teams.has(winner.team), 'time ' + winner.team);
    requireReference(seasons.has(winner.year), 'temporada ' + winner.year);
    requireReference(
      playerIds.has(winner.playerNbaId),
      'jogador ' + winner.playerNbaId,
    );
    requireReference(
      winner.year >= award.fromYear && winner.year <= award.throughYear,
      'premiação fora da cobertura',
    );
    requireReference(
      winner.sourceUrl === award.sourceUrl,
      'fonte da premiação',
    );
  }
  for (const award of catalog.awards) {
    requireReference(
      award.fromYear <= award.throughYear,
      'cobertura do prêmio',
    );
    for (let y = award.fromYear; y <= award.throughYear; y++) {
      requireReference(
        catalog.winners.some((w) => w.award === award.code && w.year === y),
        'lacuna em ' + award.code + ' ' + y,
      );
    }
  }
  const range = catalog.championshipCoverage;
  for (const final of catalog.championships) {
    requireReference(
      teams.has(final.champion) && teams.has(final.runnerUp),
      'times da final',
    );
    requireReference(seasons.has(final.year), 'temporada da final');
    requireReference(
      final.year >= range.fromYear && final.year <= range.throughYear,
      'final fora da cobertura',
    );
    requireReference(final.sourceUrl === range.sourceUrl, 'fonte da final');
  }
  for (let y = range.fromYear; y <= range.throughYear; y++) {
    requireReference(
      catalog.championships.some((c) => c.year === y),
      'lacuna nas finais de ' + y,
    );
  }
  return { ...catalog, players };
}

export type HistoryCatalog = ReturnType<typeof loadHistoryCatalog>;

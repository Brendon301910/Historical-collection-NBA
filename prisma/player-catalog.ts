import { z } from 'zod';
import * as catalog from './data/players.json';

const playerSchema = z
  .object({
    id: z.string().uuid(),
    nbaId: z.number().int().positive(),
    name: z.string().trim().min(1).max(200),
    height: z.string().regex(/^[12]\.\d{2}$/),
    yearOfBirth: z.number().int().min(1900).max(new Date().getFullYear()),
    sourceUrl: z.string().url(),
  })
  .strict()
  .refine(
    (player) =>
      player.sourceUrl === `https://www.nba.com/player/${player.nbaId}`,
    'The source must be the official NBA profile for this player',
  );

export const catalogSchema = z
  .object({
    collection: z.literal('NBA 75th Anniversary Team'),
    selectionSourceUrl: z.literal(
      'https://www.nba.com/news/nba-75th-anniversary-team-announced',
    ),
    verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    players: z.array(playerSchema).length(76),
  })
  .strict()
  .superRefine(({ players }, context) => {
    for (const key of ['id', 'nbaId', 'name'] as const) {
      if (
        new Set(players.map((player) => player[key])).size !== players.length
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['players'],
          message: `Duplicate ${key} in the NBA 75 catalog`,
        });
      }
    }
  });

export type CatalogPlayer = z.infer<typeof playerSchema>;

export function loadPlayerCatalog(): CatalogPlayer[] {
  return catalogSchema.parse(catalog).players;
}

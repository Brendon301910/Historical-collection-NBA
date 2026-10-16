import { z } from 'zod';
import * as franchises from './data/franchises.json';

const code = z.string().regex(/^[A-Z][A-Z0-9_-]{1,31}$/);
const schema = z
  .object({
    verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    franchises: z
      .array(
        z
          .object({
            code,
            teamCodes: z.array(code).min(1),
            sourceUrls: z
              .array(
                z
                  .string()
                  .url()
                  .regex(/^https:\/\/(www|cdn)\.nba\.com\//),
              )
              .min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export function loadFranchiseCatalog(
  teams: { code: string; name: string }[],
  input: unknown = franchises,
) {
  const catalog = schema.parse(input);
  const knownTeams = new Map(teams.map((team) => [team.code, team]));
  const assigned = new Set<string>();
  const codes = new Set<string>();
  const groups = catalog.franchises.map((group) => {
    const canonical = knownTeams.get(group.code);
    if (
      !canonical ||
      !group.teamCodes.includes(group.code) ||
      codes.has(group.code)
    ) {
      throw new Error('Franquia canônica inválida ou duplicada: ' + group.code);
    }
    codes.add(group.code);
    for (const teamCode of group.teamCodes) {
      if (!knownTeams.has(teamCode) || assigned.has(teamCode)) {
        throw new Error(
          'Identidade desconhecida ou duplicada nas franquias: ' + teamCode,
        );
      }
      assigned.add(teamCode);
    }
    return { ...group, name: canonical.name };
  });
  if (assigned.size !== knownTeams.size) {
    throw new Error(
      'Catálogo de franquias não cobre todas as identidades históricas',
    );
  }
  return groups;
}

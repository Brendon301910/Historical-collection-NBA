import * as history from '../../../../prisma/data/history.json';
import * as additional from '../../../../prisma/data/additional-players.json';
import { loadHistoryCatalog } from '../../../../prisma/history-catalog';

describe('Historical catalog', () => {
  it('covers every edition and includes the three shared rookie awards', () => {
    const catalog = loadHistoryCatalog();
    expect(catalog.players).toHaveLength(149);
    expect(catalog.championships).toHaveLength(80);
    expect(catalog.winners.filter((w) => w.award === 'MVP')).toHaveLength(71);
    expect(catalog.winners.filter((w) => w.award === 'DPOY')).toHaveLength(44);
    expect(catalog.winners.filter((w) => w.award === 'ROY')).toHaveLength(77);
    for (const year of [1971, 1995, 2000]) {
      expect(
        catalog.winners.filter((w) => w.award === 'ROY' && w.year === year),
      ).toHaveLength(2);
    }
    expect(catalog.championships.find((c) => c.year === 1998)).toMatchObject({
      champion: 'CHI',
      runnerUp: 'UTA',
      championWins: 4,
      runnerUpWins: 2,
    });
    expect(
      catalog.winners.find((w) => w.award === 'ROY' && w.year === 1970)
        .playerNbaId,
    ).toBe(76003);
  });

  it('keeps historical identities separate, including unrelated Baltimore teams', () => {
    const catalog = loadHistoryCatalog();
    expect(catalog.championships.find((c) => c.year === 1948).champion).toBe(
      'BAL-1947',
    );
    expect(catalog.championships.find((c) => c.year === 1971).runnerUp).toBe(
      'BAL-1963',
    );
    expect(
      catalog.winners.find((w) => w.award === 'ROY' && w.year === 2008).team,
    ).toBe('SEA');
  });

  it.each(['team', 'player', 'season', 'award', 'source'])(
    'rejects an invalid %s reference before writing',
    (kind) => {
      const input = JSON.parse(JSON.stringify(history));
      if (kind === 'team') input.winners[0].team = 'MISSING';
      if (kind === 'player') input.winners[0].playerNbaId = 999999999;
      if (kind === 'season') input.seasons = input.seasons.slice(1);
      if (kind === 'award') input.winners[0].award = 'MISSING';
      if (kind === 'source')
        input.winners[0].sourceUrl = 'https://www.nba.com/other';
      expect(() => loadHistoryCatalog(input)).toThrow();
    },
  );

  it('rejects missing editions and duplicate winners', () => {
    expect(() =>
      loadHistoryCatalog({ ...history, winners: history.winners.slice(1) }),
    ).toThrow();
    expect(() =>
      loadHistoryCatalog({
        ...history,
        winners: [...history.winners, history.winners[0]],
      }),
    ).toThrow();
    expect(() =>
      loadHistoryCatalog({
        ...history,
        championships: history.championships.slice(1),
      }),
    ).toThrow();
  });

  it('rejects inconsistent finals and seasons', () => {
    for (const change of [
      { runnerUp: history.championships[0].champion },
      { championWins: 3 },
      { runnerUpWins: 4 },
    ]) {
      const championships = history.championships.map((c, i) =>
        i ? c : { ...c, ...change },
      );
      expect(() => loadHistoryCatalog({ ...history, championships })).toThrow();
    }
    const seasons = history.seasons.map((s, i) =>
      i ? s : { ...s, endYear: s.startYear },
    );
    expect(() => loadHistoryCatalog({ ...history, seasons })).toThrow();
  });

  it('rejects duplicate players across catalogs', () => {
    expect(() =>
      loadHistoryCatalog(history, {
        ...additional,
        players: [...additional.players, additional.players[0]],
      }),
    ).toThrow();
  });
});

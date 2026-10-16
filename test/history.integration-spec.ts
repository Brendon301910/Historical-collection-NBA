import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder } from '@nestjs/swagger';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/database/prisma/prisma.service';
import { configureHttp } from '../src/infra/http/configure-http';
import { createApiDocument } from '../src/infra/http/create-api-document';
import { seedHistory } from '../prisma/seed-history';
import { seedPlayers } from '../prisma/seed-players';
import { createIsolatedDatabase } from './helpers/isolated-database';

describe('Historical seed and queries in PostgreSQL', () => {
  let database: Awaited<ReturnType<typeof createIsolatedDatabase>>;
  let prisma: PrismaService;
  let app: INestApplication;

  beforeAll(async () => {
    database = await createIsolatedDatabase();
    prisma = database.prisma;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    configureHttp(app);
    await app.init();
  });
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await database?.close();
    }
  });
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.award_winner.deleteMany(),
      prisma.championship.deleteMany(),
      prisma.team.deleteMany(),
      prisma.franchise.deleteMany(),
      prisma.award.deleteMany(),
      prisma.season.deleteMany(),
      prisma.player.deleteMany(),
    ]);
  });

  it('extends an existing NBA 75 load and exposes catalogs and stable pagination', async () => {
    await seedPlayers(prisma);
    expect(await seedHistory(prisma)).toMatchObject({
      players: { created: 73, linked: 0, unchanged: 76 },
      awards: 3,
      teams: 54,
      franchises: 33,
      seasons: 80,
      winners: 192,
      championships: 80,
    });
    const awards = (
      await request(app.getHttpServer()).get('/award').expect(200)
    ).body;
    const teams = (await request(app.getHttpServer()).get('/team').expect(200))
      .body;
    expect(awards).toHaveLength(3);
    expect(teams).toHaveLength(33);
    expect(new Set(teams.map((team) => team.code)).size).toBe(33);
    expect(
      teams.some((team) =>
        ['SEA', 'CHA-BOB', 'CHH', 'MNL'].includes(team.code),
      ),
    ).toBe(false);
    const document = await createApiDocument(
      app,
      new DocumentBuilder().setTitle('Test').build(),
    );
    for (const [path, name, catalog] of [
      ['/award/winners', 'award', awards],
      ['/award/winners', 'team', teams],
      ['/championship', 'team', teams],
    ] as const) {
      const parameter = document.paths[path].get.parameters.find(
        (p) => 'name' in p && p.name === name,
      );
      expect(parameter).toHaveProperty(
        'schema.enum',
        catalog.map((item) => item.code),
      );
    }
    const first = (
      await request(app.getHttpServer())
        .get('/championship?limit=2')
        .expect(200)
    ).body;
    const second = (
      await request(app.getHttpServer())
        .get('/championship?limit=2&page=2')
        .expect(200)
    ).body;
    expect(first).toMatchObject({ total: 80, limit: 2, page: 1 });
    expect(first.data).toEqual([
      { team: 'New York Knicks', year: 2026 },
      { team: 'Oklahoma City Thunder', year: 2025 },
    ]);
    expect(second).toMatchObject({ total: 80, limit: 2, page: 2 });
    expect(second.data).toEqual([
      { team: 'Boston Celtics', year: 2024 },
      { team: 'Denver Nuggets', year: 2023 },
    ]);
    const winners = (
      await request(app.getHttpServer())
        .get('/award/winners?limit=100')
        .expect(200)
    ).body;
    expect(winners.total).toBe(192);
    expect(winners.data).toHaveLength(100);
    const remaining = (
      await request(app.getHttpServer())
        .get('/award/winners?limit=100&page=2')
        .expect(200)
    ).body;
    expect(remaining.data).toHaveLength(92);
    const storedWinners = await prisma.award_winner.findMany({
      include: { player: true, team: true, season: true },
      orderBy: [
        { season: { end_year: 'desc' } },
        { award: { code: 'asc' } },
        { id: 'asc' },
      ],
    });
    expect(
      [...winners.data, ...remaining.data].map(({ player, year }) => ({
        player,
        year,
      })),
    ).toEqual(
      storedWinners.map((winner) => ({
        player: winner.player.name,
        year: winner.season.end_year,
      })),
    );
    await request(app.getHttpServer())
      .get('/championship?page=100')
      .expect(200)
      .expect({ data: [], total: 80, page: 100, limit: 20 });
  });

  it.each([
    ['/award/winners', 192],
    ['/championship', 80],
  ] as const)(
    'returns all results by default and paginates only on request for %s',
    async (path, total) => {
      await seedHistory(prisma);
      const all = (await request(app.getHttpServer()).get(path).expect(200))
        .body;
      expect(all).toMatchObject({ total, page: null, limit: null });
      expect(all.data).toHaveLength(total);

      for (const [query, page, limit] of [
        ['page=2', 2, 20],
        ['limit=7', 1, 7],
        ['page=2&limit=7', 2, 7],
      ] as const) {
        const result = (
          await request(app.getHttpServer())
            .get(path + '?' + query)
            .expect(200)
        ).body;
        expect(result).toEqual({
          data: all.data.slice((page - 1) * limit, page * limit),
          total,
          page,
          limit,
        });
      }
      await request(app.getHttpServer())
        .get(path + '?year=9999')
        .expect(200)
        .expect({ data: [], total: 0, page: null, limit: null });
    },
  );

  it('returns all matching awards without pagination and keeps the filters', async () => {
    await seedHistory(prisma);
    const result = (
      await request(app.getHttpServer())
        .get('/award/winners?award=MVP')
        .expect(200)
    ).body;
    expect(result).toMatchObject({ total: 71, page: null, limit: null });
    expect(result.data).toHaveLength(71);
    const filtered = (
      await request(app.getHttpServer())
        .get('/award/winners?award=MVP&year=1998&team=CHI')
        .expect(200)
    ).body;
    expect(filtered).toEqual({
      data: [{ player: 'Michael Jordan', team: 'Chicago Bulls', year: 1998 }],
      total: 1,
      page: null,
      limit: null,
    });
  });

  it('combines award, season and team filters, including shared ROY', async () => {
    await seedHistory(prisma);
    const tied = (
      await request(app.getHttpServer())
        .get('/award/winners?award=ROY&year=1995')
        .expect(200)
    ).body;
    expect(tied.total).toBe(2);
    expect(tied.data.map((w) => w.player).sort()).toEqual([
      'Grant Hill',
      'Jason Kidd',
    ]);
    const detroit = (
      await request(app.getHttpServer())
        .get('/award/winners?award=ROY&year=1995&team=DET')
        .expect(200)
    ).body;
    expect(detroit.total).toBe(1);
    expect(detroit.data).toEqual([
      { player: 'Grant Hill', team: 'Detroit Pistons', year: 1995 },
    ]);
    const result = (
      await request(app.getHttpServer())
        .get('/award/winners')
        .query({ award: 'MVP', year: 1998, team: 'CHI' })
        .expect(200)
    ).body;
    expect(result.total).toBe(1);
    expect(result.data[0]).toEqual({
      player: 'Michael Jordan',
      team: 'Chicago Bulls',
      year: 1998,
    });
    const mismatch = (
      await request(app.getHttpServer())
        .get('/award/winners?award=MVP&year=1998&team=BOS')
        .expect(200)
    ).body;
    expect(mismatch).toMatchObject({ data: [], total: 0 });
    const noEdition = (
      await request(app.getHttpServer())
        .get('/award/winners?award=DPOY&year=1950')
        .expect(200)
    ).body;
    expect(noEdition.total).toBe(0);
  });

  it('filters championship winners, preserves historical names and excludes runners-up', async () => {
    await seedHistory(prisma);
    const final = (
      await request(app.getHttpServer())
        .get('/championship?year=1998&team=CHI')
        .expect(200)
    ).body;
    expect(final.total).toBe(1);
    expect(final.data).toEqual([{ team: 'Chicago Bulls', year: 1998 }]);
    expect(
      (
        await request(app.getHttpServer())
          .get('/championship?year=1998&team=UTA')
          .expect(200)
      ).body.total,
    ).toBe(0);
    expect(
      (
        await request(app.getHttpServer())
          .get('/championship?team=CHI')
          .expect(200)
      ).body.total,
    ).toBe(6);
    const old = (
      await request(app.getHttpServer())
        .get('/championship?year=1948')
        .expect(200)
    ).body;
    expect(old.data).toEqual([{ team: 'Baltimore Bullets', year: 1948 }]);
    expect(
      (
        await request(app.getHttpServer())
          .get('/championship?team=WAS&year=1948')
          .expect(200)
      ).body.total,
    ).toBe(0);
    const rookie = (
      await request(app.getHttpServer())
        .get('/award/winners?award=ROY&year=2008')
        .expect(200)
    ).body;
    expect(rookie.data).toEqual([
      {
        player: 'Kevin Durant',
        team: 'Oklahoma City Thunder (Seattle SuperSonics)',
        year: 2008,
      },
    ]);
  });

  it('groups award winners by franchise and shows the name used for each achievement', async () => {
    await seedHistory(prisma);
    for (const [code, year, award, player, team] of [
      [
        'OKC',
        2008,
        'ROY',
        'Kevin Durant',
        'Oklahoma City Thunder (Seattle SuperSonics)',
      ],
      [
        'CHA',
        2005,
        'ROY',
        'Emeka Okafor',
        'Charlotte Hornets (Charlotte Bobcats)',
      ],
      ['CHA', 1992, 'ROY', 'Larry Johnson', 'Charlotte Hornets'],
      [
        'NOP',
        2006,
        'ROY',
        'Chris Paul',
        'New Orleans Pelicans (New Orleans/Oklahoma City Hornets)',
      ],
      [
        'BKN',
        1991,
        'ROY',
        'Derrick Coleman',
        'Brooklyn Nets (New Jersey Nets)',
      ],
      [
        'LAL',
        1959,
        'ROY',
        'Elgin Baylor',
        'Los Angeles Lakers (Minneapolis Lakers)',
      ],
      ['ATL', 1955, 'ROY', 'Bob Pettit', 'Atlanta Hawks (Milwaukee Hawks)'],
      [
        'GSW',
        1960,
        'MVP',
        'Wilt Chamberlain',
        'Golden State Warriors (Philadelphia Warriors)',
      ],
      [
        'SAC',
        1964,
        'MVP',
        'Oscar Robertson',
        'Sacramento Kings (Cincinnati Royals)',
      ],
      ['LAC', 1975, 'MVP', 'Bob McAdoo', 'LA Clippers (Buffalo Braves)'],
      [
        'WAS',
        1969,
        'MVP',
        'Wes Unseld',
        'Washington Wizards (Baltimore Bullets)',
      ],
      [
        'DET',
        1953,
        'ROY',
        'Don Meineke',
        'Detroit Pistons (Fort Wayne Pistons)',
      ],
    ] as const) {
      await request(app.getHttpServer())
        .get('/award/winners')
        .query({ team: code, year, award })
        .expect(200)
        .expect({
          data: [{ player, team, year }],
          total: 1,
          page: null,
          limit: null,
        });
    }
    for (const query of [
      'team=NOP&year=1992',
      'team=CHA&year=2006',
      'team=OKC&year=2006',
    ]) {
      await request(app.getHttpServer())
        .get('/award/winners?award=ROY&' + query)
        .expect(200)
        .expect({ data: [], total: 0, page: null, limit: null });
    }
  });

  it('combines historical championships, including alias filters and pagination', async () => {
    await seedHistory(prisma);
    for (const [code, year, team] of [
      ['OKC', 1979, 'Oklahoma City Thunder (Seattle SuperSonics)'],
      ['LAL', 1954, 'Los Angeles Lakers (Minneapolis Lakers)'],
      ['ATL', 1958, 'Atlanta Hawks (St. Louis Hawks)'],
      ['SAC', 1951, 'Sacramento Kings (Rochester Royals)'],
      ['PHI', 1955, 'Philadelphia 76ers (Syracuse Nationals)'],
      ['GSW', 1947, 'Golden State Warriors (Philadelphia Warriors)'],
      ['WAS', 1978, 'Washington Wizards (Washington Bullets)'],
    ] as const) {
      await request(app.getHttpServer())
        .get('/championship')
        .query({ team: code, year })
        .expect(200)
        .expect({ data: [{ team, year }], total: 1, page: null, limit: null });
    }
    const all = (
      await request(app.getHttpServer())
        .get('/championship?team=LAL')
        .expect(200)
    ).body;
    expect(all.total).toBe(17);
    expect(
      all.data.filter((c) => c.team.includes('(Minneapolis Lakers)')),
    ).toHaveLength(5);
    await request(app.getHttpServer())
      .get('/championship?team=MNL')
      .expect(200)
      .expect(all);
    await request(app.getHttpServer())
      .get('/championship?team=LAL&page=2&limit=3')
      .expect(200)
      .expect({ data: all.data.slice(3, 6), total: 17, page: 2, limit: 3 });
    for (const path of ['/award/winners', '/championship']) {
      const canonical = (
        await request(app.getHttpServer())
          .get(path + '?team=OKC')
          .expect(200)
      ).body;
      await request(app.getHttpServer())
        .get(path + '?team=SEA')
        .expect(200)
        .expect(canonical);
    }
    await request(app.getHttpServer())
      .get('/championship?team=BAL-1963')
      .expect(200)
      .expect({
        data: [{ team: 'Washington Wizards (Washington Bullets)', year: 1978 }],
        total: 1,
        page: null,
        limit: null,
      });
  });

  it('links existing identities without replacing their IDs or achievements and is idempotent', async () => {
    const localId = randomUUID();
    await prisma.team.create({
      data: { id: localId, code: 'SEA', name: 'Seattle SuperSonics' },
    });
    await seedHistory(prisma);
    const winners = await prisma.award_winner.findMany({
      orderBy: { id: 'asc' },
    });
    const finals = await prisma.championship.findMany({
      orderBy: { id: 'asc' },
    });
    // State after migrating an existing installation but before loading links.
    await prisma.team.updateMany({ data: { franchise_code: null } });
    await prisma.franchise.deleteMany();
    await seedHistory(prisma);
    expect(
      await prisma.team.findUnique({ where: { code: 'SEA' } }),
    ).toMatchObject({
      id: localId,
      name: 'Seattle SuperSonics',
      franchise_code: 'OKC',
    });
    expect(
      await prisma.award_winner.findMany({ orderBy: { id: 'asc' } }),
    ).toEqual(winners);
    expect(
      await prisma.championship.findMany({ orderBy: { id: 'asc' } }),
    ).toEqual(finals);
    const teams = await prisma.team.findMany({ orderBy: { id: 'asc' } });
    await seedHistory(prisma);
    expect(await prisma.team.findMany({ orderBy: { id: 'asc' } })).toEqual(
      teams,
    );
    expect(await prisma.franchise.count()).toBe(33);
  });

  it('rolls back newly filled links when an existing franchise assignment conflicts', async () => {
    await seedHistory(prisma);
    await prisma.team.update({
      where: { code: 'ATL' },
      data: { franchise_code: null },
    });
    await prisma.team.update({
      where: { code: 'SEA' },
      data: { franchise_code: 'LAL' },
    });
    await expect(seedHistory(prisma)).rejects.toThrow(
      'Divergência em franquia do time SEA',
    );
    expect(
      (await prisma.team.findUnique({ where: { code: 'ATL' } })).franchise_code,
    ).toBeNull();
    expect(
      (await prisma.team.findUnique({ where: { code: 'SEA' } })).franchise_code,
    ).toBe('LAL');
  });

  it('preserves reconciled local IDs, player edits, timestamps and historical achievements after soft deletion', async () => {
    const local = await prisma.player.create({
      data: {
        id: randomUUID(),
        name: '  Michael  Jordan ',
        height: '2.00',
        year_of_birth: 1963,
      },
    });
    expect((await seedHistory(prisma)).players).toEqual({
      created: 148,
      linked: 1,
      unchanged: 0,
    });
    expect(
      await prisma.award_winner.count({ where: { player_id: local.id } }),
    ).toBeGreaterThan(0);
    await prisma.player.update({
      where: { id: local.id },
      data: { name: 'Edited Jordan', deleted_at: new Date() },
    });
    const beforePlayers = await prisma.player.findMany({
      orderBy: { id: 'asc' },
    });
    const beforeWinners = await prisma.award_winner.findMany({
      orderBy: { id: 'asc' },
    });
    const beforeFinals = await prisma.championship.findMany({
      orderBy: { id: 'asc' },
    });
    expect((await seedHistory(prisma)).players).toEqual({
      created: 0,
      linked: 0,
      unchanged: 149,
    });
    expect(await prisma.player.findMany({ orderBy: { id: 'asc' } })).toEqual(
      beforePlayers,
    );
    expect(
      await prisma.award_winner.findMany({ orderBy: { id: 'asc' } }),
    ).toEqual(beforeWinners);
    expect(
      await prisma.championship.findMany({ orderBy: { id: 'asc' } }),
    ).toEqual(beforeFinals);
    const awards = (
      await request(app.getHttpServer())
        .get('/award/winners?award=MVP&year=1998&team=CHI')
        .expect(200)
    ).body;
    expect(awards.total).toBe(1);
    expect(awards.data).toEqual([
      { player: 'Edited Jordan', team: 'Chicago Bulls', year: 1998 },
    ]);
    const players = (
      await request(app.getHttpServer()).get('/player').expect(200)
    ).body;
    expect(players.some((p) => p.id === local.id)).toBe(false);
  });

  it('rolls back the entire seed on an existing historical conflict', async () => {
    await seedHistory(prisma);
    const oldest = await prisma.championship.findFirst({
      orderBy: { season: { end_year: 'asc' } },
    });
    await prisma.championship.update({
      where: { id: oldest.id },
      data: { runner_up_wins: 3 },
    });
    const winner = await prisma.award_winner.findFirst();
    await prisma.award_winner.delete({ where: { id: winner.id } });
    await expect(seedHistory(prisma)).rejects.toThrow('Divergência em final');
    expect(
      await prisma.award_winner.findUnique({ where: { id: winner.id } }),
    ).toBeNull();
    expect(await prisma.award_winner.count()).toBe(191);
    expect(
      (await prisma.championship.findUnique({ where: { id: oldest.id } }))
        .runner_up_wins,
    ).toBe(3);
  });

  it('serializes concurrent full seeds without duplicating achievements', async () => {
    const results = await Promise.all([
      seedHistory(prisma),
      seedHistory(prisma),
    ]);
    expect(results.map((r) => r.players.created).sort((a, b) => a - b)).toEqual(
      [0, 149],
    );
    expect(await prisma.player.count()).toBe(149);
    expect(await prisma.award_winner.count()).toBe(192);
    expect(await prisma.championship.count()).toBe(80);
  });

  it('enforces foreign keys, distinct finalists, valid scores and uniqueness in the database', async () => {
    await seedHistory(prisma);
    await expect(
      prisma.franchise.delete({ where: { code: 'OKC' } }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      prisma.team.update({
        where: { code: 'SEA' },
        data: { franchise_code: 'UNKNOWN' },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    const winner = await prisma.award_winner.findFirst();
    const final = await prisma.championship.findFirst();
    await expect(
      prisma.award_winner.create({ data: { ...winner, id: randomUUID() } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.championship.create({ data: { ...final, id: randomUUID() } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.player.delete({ where: { id: winner.player_id } }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      prisma.award_winner.update({
        where: { id: winner.id },
        data: { team_id: randomUUID() },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      prisma.championship.update({
        where: { id: final.id },
        data: { runner_up_team_id: final.champion_team_id },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.championship.update({
        where: { id: final.id },
        data: { champion_wins: 3 },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.season.update({
        where: { id: final.season_id },
        data: { start_year: 1 },
      }),
    ).rejects.toThrow();
  });
});

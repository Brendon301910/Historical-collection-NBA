import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/database/prisma/prisma.service';
import { configureHttp } from '../src/infra/http/configure-http';
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
      seasons: 80,
      winners: 192,
      championships: 80,
    });
    expect(
      (await request(app.getHttpServer()).get('/award').expect(200)).body,
    ).toHaveLength(3);
    expect(
      (await request(app.getHttpServer()).get('/team').expect(200)).body,
    ).toHaveLength(54);
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
      { team: 'New York Knicks' },
      { team: 'Oklahoma City Thunder' },
    ]);
    expect(second).toMatchObject({ total: 80, limit: 2, page: 2 });
    expect(second.data).toEqual([
      { team: 'Boston Celtics' },
      { team: 'Denver Nuggets' },
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
    expect([...winners.data, ...remaining.data]).toEqual(
      storedWinners.map((winner) => ({
        player: winner.player.name,
        team: winner.team.name,
        year: winner.season.end_year,
      })),
    );
    await request(app.getHttpServer())
      .get('/championship?page=100')
      .expect(200)
      .expect({ data: [], total: 80, page: 100, limit: 20 });
  });

  it('combines award, season, team and player filters, including shared ROY', async () => {
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
    const jordan = await prisma.player.findUnique({ where: { nba_id: 893 } });
    const result = (
      await request(app.getHttpServer())
        .get('/award/winners')
        .query({ award: 'MVP', year: 1998, team: 'CHI', playerId: jordan.id })
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
    expect(final.data).toEqual([{ team: 'Chicago Bulls' }]);
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
    expect(old.data).toEqual([{ team: 'Baltimore Bullets' }]);
    expect(
      (
        await request(app.getHttpServer())
          .get('/championship?team=BAL-1963')
          .expect(200)
      ).body.total,
    ).toBe(0);
    const rookie = (
      await request(app.getHttpServer())
        .get('/award/winners?award=ROY&year=2008')
        .expect(200)
    ).body;
    expect(rookie.data).toEqual([
      { player: 'Kevin Durant', team: 'Seattle SuperSonics', year: 2008 },
    ]);
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
        .get('/award/winners?playerId=' + local.id)
        .expect(200)
    ).body;
    expect(awards.total).toBeGreaterThan(0);
    expect(awards.data.every((w) => w.player === 'Edited Jordan')).toBe(true);
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

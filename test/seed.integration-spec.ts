import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/database/prisma/prisma.service';
import { loadPlayerCatalog } from '../prisma/player-catalog';
import { seedPlayers } from '../prisma/seed-players';

describe('NBA 75 seed in PostgreSQL', () => {
  const schema = `nba75_test_${randomUUID().replace(/-/g, '')}`;
  const catalog = loadPlayerCatalog();
  let admin: PrismaClient;
  let prisma: PrismaClient;
  let app: INestApplication;
  let schemaCreated = false;

  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error(
        'Set TEST_DATABASE_URL to a migrated PostgreSQL test database',
      );
    }
    const url = new URL(process.env.TEST_DATABASE_URL);
    const sourceSchema = (url.searchParams.get('schema') ?? 'public').replace(
      /"/g,
      '""',
    );
    admin = new PrismaClient({
      datasources: { db: { url: process.env.TEST_DATABASE_URL } },
    });
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    await admin.$executeRawUnsafe(
      `CREATE TABLE "${schema}"."player" (LIKE "${sourceSchema}"."player" INCLUDING ALL)`,
    );
    url.searchParams.set('schema', schema);
    prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
  });

  beforeEach(async () => {
    // This client points exclusively to the random schema created by this suite.
    await prisma.player.deleteMany();
  });

  afterAll(async () => {
    try {
      await app?.close();
      await prisma?.$disconnect();
      if (schemaCreated) {
        await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      }
    } finally {
      await admin?.$disconnect();
    }
  });

  it('loads the complete catalog and exposes it through GET /player', async () => {
    expect(await seedPlayers(prisma)).toEqual({
      created: 76,
      linked: 0,
      unchanged: 0,
    });
    const { body } = await request(app.getHttpServer())
      .get('/player')
      .expect(200);

    expect(body).toHaveLength(76);
    for (const player of catalog) {
      expect(body).toContainEqual({
        id: player.id,
        name: player.name,
        height: player.height,
        year_of_birth: player.yearOfBirth,
        created_at: expect.any(String),
      });
    }
  });

  it('preserves IDs, timestamps, edits and soft deletions on subsequent runs', async () => {
    await seedPlayers(prisma);
    await prisma.player.update({
      where: { nba_id: 893 },
      data: {
        name: 'Edited player name',
        height: '2.00',
        year_of_birth: 1964,
        updated_at: new Date('2026-01-01T00:00:00Z'),
        deleted_at: new Date('2026-01-02T00:00:00Z'),
      },
    });
    const before = await prisma.player.findMany({ orderBy: { id: 'asc' } });

    expect(await seedPlayers(prisma)).toEqual({
      created: 0,
      linked: 0,
      unchanged: 76,
    });
    expect(await prisma.player.findMany({ orderBy: { id: 'asc' } })).toEqual(
      before,
    );
    const { body } = await request(app.getHttpServer())
      .get('/player')
      .expect(200);
    expect(body).toHaveLength(75);
  });

  it('links unambiguous manual records without replacing their data or IDs', async () => {
    const jordan = await prisma.player.create({
      data: {
        id: randomUUID(),
        name: '  michael   jordan  ',
        height: '1.99',
        year_of_birth: 1963,
        created_at: new Date('2020-01-01T00:00:00Z'),
      },
    });
    const kobe = await prisma.player.create({
      data: {
        id: randomUUID(),
        name: 'Kobe Bryant',
        height: '1.98',
        year_of_birth: 1978,
        deleted_at: new Date('2020-02-01T00:00:00Z'),
      },
    });
    const unrelated = await prisma.player.create({
      data: {
        id: randomUUID(),
        name: 'Local Player',
        height: '1.90',
        year_of_birth: 1990,
      },
    });

    expect(await seedPlayers(prisma)).toEqual({
      created: 74,
      linked: 2,
      unchanged: 0,
    });
    expect(await prisma.player.findUnique({ where: { nba_id: 893 } })).toEqual({
      ...jordan,
      nba_id: 893,
    });
    expect(await prisma.player.findUnique({ where: { nba_id: 977 } })).toEqual({
      ...kobe,
      nba_id: 977,
    });
    expect(
      await prisma.player.findUnique({ where: { id: unrelated.id } }),
    ).toEqual(unrelated);
    expect(await prisma.player.count()).toBe(77);
    expect(await seedPlayers(prisma)).toEqual({
      created: 0,
      linked: 0,
      unchanged: 76,
    });
  });

  it('rolls back the entire seed when manual duplicates require reconciliation', async () => {
    await prisma.player.createMany({
      data: [
        {
          id: randomUUID(),
          name: 'Michael Jordan',
          height: '1.98',
          year_of_birth: 1963,
        },
        {
          id: randomUUID(),
          name: ' MICHAEL JORDAN ',
          height: '1.98',
          year_of_birth: 1963,
        },
      ],
    });
    const before = await prisma.player.findMany({ orderBy: { id: 'asc' } });

    await expect(seedPlayers(prisma)).rejects.toThrow(
      'Conciliação necessária para Michael Jordan',
    );
    expect(await prisma.player.findMany({ orderBy: { id: 'asc' } })).toEqual(
      before,
    );
  });

  it('requires reconciliation when a manual birth year differs', async () => {
    const manual = await prisma.player.create({
      data: {
        id: randomUUID(),
        name: 'Michael Jordan',
        height: '1.98',
        year_of_birth: 1964,
      },
    });

    await expect(seedPlayers(prisma)).rejects.toThrow('Conciliação necessária');
    expect(await prisma.player.findMany()).toEqual([manual]);
  });

  it('does not overwrite an unrelated record using a reserved seed ID', async () => {
    const manual = await prisma.player.create({
      data: {
        id: catalog[0].id,
        name: 'Other Player',
        height: '1.90',
        year_of_birth: 1990,
      },
    });

    await expect(seedPlayers(prisma)).rejects.toThrow(
      'já pertence a outro cadastro',
    );
    expect(await prisma.player.findMany()).toEqual([manual]);
  });

  it('serializes concurrent executions without duplicate records', async () => {
    const results = await Promise.all([
      seedPlayers(prisma),
      seedPlayers(prisma),
    ]);

    expect(
      results.map((result) => result.created).sort((a, b) => a - b),
    ).toEqual([0, 76]);
    expect(
      results.map((result) => result.unchanged).sort((a, b) => a - b),
    ).toEqual([0, 76]);
    expect(await prisma.player.count()).toBe(76);
  });
});

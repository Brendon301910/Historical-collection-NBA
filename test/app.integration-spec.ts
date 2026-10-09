import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/database/prisma/prisma.service';
import { configureHttp } from '../src/infra/http/configure-http';
import { randomUUID } from 'crypto';

describe('Player persistence in PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url) {
      throw new Error(
        'Set TEST_DATABASE_URL to a migrated PostgreSQL test database',
      );
    }

    prisma = new PrismaService({ datasources: { db: { url } } });
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
      if (createdIds.length) {
        await prisma.player.deleteMany({ where: { id: { in: createdIds } } });
      }
    } finally {
      await app?.close();
      await prisma?.$disconnect();
    }
  });

  it('returns the same ID, fields and creation date stored in PostgreSQL', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/player')
      .send({
        name: 'Integration Test Player',
        height: '1.98',
        yearOfBirth: 1963,
      })
      .expect(201);

    const createdId = body.id;
    createdIds.push(createdId);
    const saved = await prisma.player.findUnique({ where: { id: createdId } });

    expect(saved).toEqual({
      id: body.id,
      name: body.name,
      height: body.height,
      year_of_birth: body.year_of_birth,
      created_at: new Date(body.created_at),
      updated_at: null,
      deleted_at: null,
    });
  });

  it('lists players created through POST /player', async () => {
    const { body: created } = await request(app.getHttpServer())
      .post('/player')
      .send({ name: 'Listed Test Player', height: '2.06', yearOfBirth: 1984 })
      .expect(201);
    createdIds.push(created.id);

    const { body } = await request(app.getHttpServer())
      .get('/player')
      .expect(200);

    expect(body).toContainEqual(created);
  });

  it('orders players by creation date and ID, excluding deleted records', async () => {
    const ids = Array.from({ length: 4 }, () => randomUUID()).sort();
    createdIds.push(...ids);
    const data = {
      name: 'Ordering Test Player',
      height: '1.98',
      year_of_birth: 1963,
      created_at: new Date('2020-01-01T00:00:00Z'),
    };
    await prisma.player.createMany({
      data: [
        { ...data, id: ids[0], created_at: new Date('2020-01-02T00:00:00Z') },
        { ...data, id: ids[2] },
        { ...data, id: ids[1] },
        { ...data, id: ids[3], deleted_at: new Date() },
      ],
    });

    const { body } = await request(app.getHttpServer())
      .get('/player')
      .expect(200);
    const listedIds = body
      .filter((player: { id: string }) => ids.includes(player.id))
      .map((player: { id: string }) => player.id);

    expect(listedIds).toEqual([ids[1], ids[2], ids[0]]);
  });
});

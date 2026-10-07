import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/database/prisma/prisma.service';
import { configureHttp } from '../src/infra/http/configure-http';

describe('Player persistence in PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createdId: string;

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
      if (createdId) {
        await prisma.player.delete({ where: { id: createdId } });
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

    createdId = body.id;
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
});

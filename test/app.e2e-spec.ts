import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/database/prisma/prisma.service';
import { configureHttp } from '../src/infra/http/configure-http';

describe('HTTP endpoints', () => {
  let app: INestApplication;
  const create = jest.fn();
  const findMany = jest.fn();
  const validPlayer = {
    name: 'Michael Jordan',
    height: '1.98',
    yearOfBirth: 1963,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ player: { create, findMany } })
      .compile();

    app = module.createNestApplication();
    app.useLogger(false);
    configureHttp(app);
    await app.init();
  });

  beforeEach(() => {
    create.mockReset();
    create.mockImplementation(async ({ data }) => data);
    findMany.mockReset();
    findMany.mockResolvedValue([]);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health returns the existing health response', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ health: true });
    expect(create).not.toHaveBeenCalled();
  });

  it('GET /player returns an empty array when no players are registered', async () => {
    await request(app.getHttpServer()).get('/player').expect(200).expect([]);
  });

  it('GET /player returns persisted players using the HTTP response format', async () => {
    const records = [
      {
        id: 'c14c74e3-3d29-45d9-ad08-0aceab7a6a33',
        name: 'Michael Jordan',
        height: '1.98',
        year_of_birth: 1963,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: null,
        deleted_at: null,
      },
      {
        id: 'a14c74e3-3d29-45d9-ad08-0aceab7a6a33',
        name: 'LeBron James',
        height: '2.06',
        year_of_birth: 1984,
        created_at: new Date('2026-01-02T00:00:00Z'),
        updated_at: null,
        deleted_at: null,
      },
    ];
    findMany.mockResolvedValueOnce(records);

    const { body } = await request(app.getHttpServer())
      .get('/player')
      .expect(200);

    expect(body).toEqual(
      records.map(({ id, name, height, year_of_birth, created_at }) => ({
        id,
        name,
        height,
        year_of_birth,
        created_at: created_at.toISOString(),
      })),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('GET /player returns 500 without exposing details when the query fails', async () => {
    findMany.mockRejectedValueOnce(new Error('private database details'));

    const { body } = await request(app.getHttpServer())
      .get('/player')
      .expect(500);

    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('private database details');
  });

  it('POST /player persists mapped fields and returns the created player', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/player')
      .send({ ...validPlayer, name: ' Michael Jordan ', height: ' 1.98 ' })
      .expect(201);

    expect(body).toEqual({
      id: expect.any(String),
      name: validPlayer.name,
      height: validPlayer.height,
      year_of_birth: validPlayer.yearOfBirth,
      created_at: expect.any(String),
    });
    expect(new Date(body.created_at).toISOString()).toBe(body.created_at);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        id: body.id,
        name: validPlayer.name,
        height: validPlayer.height,
        year_of_birth: validPlayer.yearOfBirth,
        created_at: new Date(body.created_at),
        updated_at: undefined,
        deleted_at: undefined,
      },
    });
  });

  it.each([
    ['missing fields', {}],
    ['blank name', { ...validPlayer, name: '   ' }],
    ['numeric name', { ...validPlayer, name: 23 }],
    ['long name', { ...validPlayer, name: 'a'.repeat(201) }],
    ['blank height', { ...validPlayer, height: '   ' }],
    ['numeric height', { ...validPlayer, height: 1.98 }],
    ['long height', { ...validPlayer, height: 'a'.repeat(21) }],
    ['text birth year', { ...validPlayer, yearOfBirth: '1963' }],
    ['fractional birth year', { ...validPlayer, yearOfBirth: 1963.5 }],
    ['zero birth year', { ...validPlayer, yearOfBirth: 0 }],
    ['null birth year', { ...validPlayer, yearOfBirth: null }],
    [
      'future birth year',
      { ...validPlayer, yearOfBirth: new Date().getFullYear() + 1 },
    ],
    ['unknown field', { ...validPlayer, id: 'client-supplied-id' }],
  ])('POST /player rejects %s before persistence', async (_label, payload) => {
    const { body } = await request(app.getHttpServer())
      .post('/player')
      .send(payload)
      .expect(400);

    expect(body.message).toBeInstanceOf(Array);
    expect(create).not.toHaveBeenCalled();
  });

  it('does not report success or expose database details after a write failure', async () => {
    create.mockRejectedValueOnce(new Error('private database details'));

    const { body } = await request(app.getHttpServer())
      .post('/player')
      .send(validPlayer)
      .expect(500);

    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('private database details');
  });
});

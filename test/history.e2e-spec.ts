import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { IHistoryRepository } from '../src/application/contracts/repositories/history-repository.contract';
import { PrismaService } from '../src/infra/database/prisma/prisma.service';
import { configureHttp } from '../src/infra/http/configure-http';

describe('Historical HTTP queries', () => {
  let app: INestApplication;
  const repository = {
    listAwards: jest.fn(),
    listTeams: jest.fn(),
    listWinners: jest.fn(),
    listChampionships: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(IHistoryRepository)
      .useValue(repository)
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    configureHttp(app);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    repository.listAwards.mockResolvedValue([
      { id: 'award-id', code: 'MVP', name: 'Most Valuable Player' },
    ]);
    repository.listTeams.mockResolvedValue([
      { id: 'team-id', code: 'CHI', name: 'Chicago Bulls' },
    ]);
    repository.listWinners.mockImplementation(async ({ page, limit }) => ({
      data: [],
      total: 0,
      page,
      limit,
    }));
    repository.listChampionships.mockImplementation(
      async ({ page, limit }) => ({ data: [], total: 0, page, limit }),
    );
  });

  it('lists categories and team filter codes', async () => {
    expect(
      (await request(app.getHttpServer()).get('/award').expect(200)).body[0]
        .code,
    ).toBe('MVP');
    expect(
      (await request(app.getHttpServer()).get('/team').expect(200)).body[0]
        .code,
    ).toBe('CHI');
  });

  it.each(['/award/winners', '/championship'])(
    'returns a stable empty page for %s',
    async (path) => {
      await request(app.getHttpServer())
        .get(path)
        .expect(200)
        .expect({ data: [], total: 0, page: 1, limit: 20 });
    },
  );

  it('normalizes codes and converts numeric filters', async () => {
    const playerId = '31f42f42-ef5c-4bbf-9e45-e8577abf1743';
    await request(app.getHttpServer())
      .get('/award/winners')
      .query({
        award: ' mvp ',
        team: 'chi',
        year: '1998',
        page: '2',
        limit: '5',
        playerId,
      })
      .expect(200);
    expect(repository.listWinners).toHaveBeenCalledWith({
      award: 'MVP',
      team: 'CHI',
      year: 1998,
      page: 2,
      limit: 5,
      playerId,
    });
    await request(app.getHttpServer())
      .get('/championship?year=1998&team=chi')
      .expect(200);
    expect(repository.listChampionships).toHaveBeenCalledWith({
      year: 1998,
      team: 'CHI',
      page: 1,
      limit: 20,
    });
  });

  it.each([
    'year=1997-98',
    'year=1998.5',
    'year=abc',
    'year=',
    'year=0',
    'year=10000',
    'page=0',
    'page=-1',
    'page=1.5',
    'page=1000001',
    'page=1e2',
    'page=0x10',
    'limit=0',
    'limit=101',
    'limit=',
    'team=',
    'team=NO_SUCH_TEAM',
    'year=1998&year=1999',
    'team=CHI&team=BOS',
    'unknown=value',
  ])('rejects malformed shared filters: %s', async (query) => {
    for (const path of ['/award/winners', '/championship']) {
      await request(app.getHttpServer())
        .get(path + '?' + query)
        .expect(400);
    }
    expect(repository.listWinners).not.toHaveBeenCalled();
    expect(repository.listChampionships).not.toHaveBeenCalled();
  });

  it.each(['award=UNKNOWN', 'award=', 'playerId=123', 'award=MVP&award=ROY'])(
    'rejects invalid award filters: %s',
    async (query) => {
      await request(app.getHttpServer())
        .get('/award/winners?' + query)
        .expect(400);
      expect(repository.listWinners).not.toHaveBeenCalled();
    },
  );

  it('does not accept award filters on championships', async () => {
    await request(app.getHttpServer())
      .get('/championship?award=MVP')
      .expect(400);
  });

  it('does not expose database errors', async () => {
    repository.listWinners.mockRejectedValueOnce(
      new Error('secret database host'),
    );
    const response = await request(app.getHttpServer())
      .get('/award/winners')
      .expect(500);
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('documents filters and paginated nested responses in Swagger', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Test').build(),
    );
    const operation = document.paths['/award/winners'].get;
    expect(
      operation.parameters.map((p) => ('name' in p ? p.name : '')),
    ).toEqual(
      expect.arrayContaining([
        'award',
        'year',
        'team',
        'playerId',
        'page',
        'limit',
      ]),
    );
    expect(
      document.components.schemas.AwardWinnersPageViewModel,
    ).toHaveProperty('properties.data');
    expect(document.components.schemas.ChampionshipViewModel).toHaveProperty(
      'properties.runner_up',
    );
  });
});

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

  it('lists only public names and filter codes in catalogs', async () => {
    await request(app.getHttpServer())
      .get('/award')
      .expect(200)
      .expect([{ code: 'MVP', name: 'Most Valuable Player' }]);
    await request(app.getHttpServer())
      .get('/team')
      .expect(200)
      .expect([{ code: 'CHI', name: 'Chicago Bulls' }]);
  });

  it('returns only player name, historical team name and season end year for winners', async () => {
    repository.listWinners.mockResolvedValueOnce({
      data: [
        {
          id: 'winner-id',
          award: { id: 'award-id', code: 'MVP', name: 'Most Valuable Player' },
          season: { start_year: 1997, end_year: 1998 },
          player: { id: 'player-id', name: 'Michael Jordan' },
          team: { id: 'team-id', code: 'CHI', name: 'Chicago Bulls' },
          source_url: 'https://www.nba.com/history/awards/mvp',
        },
      ],
      total: 6,
      page: 2,
      limit: 1,
    });

    await request(app.getHttpServer())
      .get('/award/winners?award=MVP&team=CHI&page=2&limit=1')
      .expect(200)
      .expect({
        data: [{ player: 'Michael Jordan', team: 'Chicago Bulls', year: 1998 }],
        total: 6,
        page: 2,
        limit: 1,
      });
  });

  it('returns only champion names and keeps separate titles by the same team', async () => {
    const championship = {
      id: 'championship-id',
      season: { start_year: 1997, end_year: 1998 },
      champion: { id: 'team-id', code: 'CHI', name: 'Chicago Bulls' },
      runner_up: { id: 'runner-up-id', code: 'UTA', name: 'Utah Jazz' },
      champion_wins: 4,
      runner_up_wins: 2,
      source_url: 'https://www.nba.com/history/champions',
    };
    repository.listChampionships.mockResolvedValueOnce({
      data: [
        championship,
        {
          ...championship,
          id: 'another-championship-id',
          season: { start_year: 1996, end_year: 1997 },
        },
      ],
      total: 6,
      page: 1,
      limit: 2,
    });

    await request(app.getHttpServer())
      .get('/championship?team=CHI&limit=2')
      .expect(200)
      .expect({
        data: [{ team: 'Chicago Bulls' }, { team: 'Chicago Bulls' }],
        total: 6,
        page: 1,
        limit: 2,
      });
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

  it('documents filters and only the public response fields in Swagger', () => {
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
    const schemas = document.components.schemas;
    const expectedFields = {
      AwardViewModel: ['code', 'name'],
      CatalogItemViewModel: ['code', 'name'],
      AwardWinnerViewModel: ['player', 'team', 'year'],
      ChampionshipViewModel: ['team'],
      AwardWinnersPageViewModel: ['data', 'total', 'page', 'limit'],
      ChampionshipsPageViewModel: ['data', 'total', 'page', 'limit'],
    };
    for (const [name, fields] of Object.entries(expectedFields)) {
      const schema = schemas[name];
      expect(
        'properties' in schema && Object.keys(schema.properties).sort(),
      ).toEqual(fields.sort());
    }
    expect(schemas.AwardWinnersPageViewModel).toHaveProperty(
      'properties.data.items.$ref',
      '#/components/schemas/AwardWinnerViewModel',
    );
    expect(schemas.ChampionshipsPageViewModel).toHaveProperty(
      'properties.data.items.$ref',
      '#/components/schemas/ChampionshipViewModel',
    );
  });
});

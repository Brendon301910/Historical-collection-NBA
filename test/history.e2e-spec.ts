import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder } from '@nestjs/swagger';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { IHistoryRepository } from '../src/application/contracts/repositories/history-repository.contract';
import { PrismaService } from '../src/infra/database/prisma/prisma.service';
import { configureHttp } from '../src/infra/http/configure-http';
import { createApiDocument } from '../src/infra/http/create-api-document';

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
      page: page ?? null,
      limit: limit ?? null,
    }));
    repository.listChampionships.mockImplementation(
      async ({ page, limit }) => ({
        data: [],
        total: 0,
        page: page ?? null,
        limit: limit ?? null,
      }),
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

  it('lists one option per franchise and resolves historical filter codes', async () => {
    repository.listTeams.mockResolvedValue([
      {
        id: 'sea',
        code: 'SEA',
        name: 'Seattle SuperSonics',
        franchise: { code: 'OKC', name: 'Oklahoma City Thunder' },
      },
      {
        id: 'okc',
        code: 'OKC',
        name: 'Oklahoma City Thunder',
        franchise: { code: 'OKC', name: 'Oklahoma City Thunder' },
      },
      { id: 'local', code: 'LOCAL', name: 'Local Team', franchise: null },
    ]);
    await request(app.getHttpServer())
      .get('/team')
      .expect(200)
      .expect([
        { code: 'LOCAL', name: 'Local Team' },
        { code: 'OKC', name: 'Oklahoma City Thunder' },
      ]);
    for (const team of ['OKC', 'SEA']) {
      await request(app.getHttpServer())
        .get('/award/winners')
        .query({ team })
        .expect(200);
      expect(repository.listWinners).toHaveBeenLastCalledWith({ team: 'OKC' });
      await request(app.getHttpServer())
        .get('/championship')
        .query({ team })
        .expect(200);
      expect(repository.listChampionships).toHaveBeenLastCalledWith({
        team: 'OKC',
      });
    }
    const document = await createApiDocument(
      app,
      new DocumentBuilder().setTitle('Test').build(),
    );
    const parameter = document.paths['/championship'].get.parameters.find(
      (p) => 'name' in p && p.name === 'team',
    );
    expect(parameter).toHaveProperty('schema.enum', ['LOCAL', 'OKC']);
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

  it('returns champion names and season end years for separate titles by the same team', async () => {
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
        data: [
          { team: 'Chicago Bulls', year: 1998 },
          { team: 'Chicago Bulls', year: 1997 },
        ],
        total: 6,
        page: 1,
        limit: 2,
      });
  });

  it.each(['/award/winners', '/championship'])(
    'returns an unpaginated empty result when pagination is omitted on %s',
    async (path) => {
      await request(app.getHttpServer())
        .get(path)
        .expect(200)
        .expect({ data: [], total: 0, page: null, limit: null });
      const method =
        path === '/award/winners'
          ? repository.listWinners
          : repository.listChampionships;
      expect(method).toHaveBeenCalledWith({});
    },
  );

  it('normalizes codes and converts numeric filters', async () => {
    await request(app.getHttpServer())
      .get('/award/winners')
      .query({
        award: ' mvp ',
        team: 'chi',
        year: '1998',
        page: '2',
        limit: '5',
      })
      .expect(200);
    expect(repository.listWinners).toHaveBeenCalledWith({
      award: 'MVP',
      team: 'CHI',
      year: 1998,
      page: 2,
      limit: 5,
    });
    await request(app.getHttpServer())
      .get('/championship?year=1998&team=chi')
      .expect(200);
    expect(repository.listChampionships).toHaveBeenCalledWith({
      year: 1998,
      team: 'CHI',
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
    'page=',
    'page=-1',
    'page=1.5',
    'page=1000001',
    'page=1e2',
    'page=0x10',
    'limit=0',
    'limit=101',
    'limit=',
    'page=1&page=2',
    'limit=10&limit=20',
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

  it.each(['award=UNKNOWN', 'award=', 'award=MVP&award=ROY'])(
    'rejects invalid award filters: %s',
    async (query) => {
      await request(app.getHttpServer())
        .get('/award/winners?' + query)
        .expect(400);
      expect(repository.listWinners).not.toHaveBeenCalled();
    },
  );

  it.each(['/award/winners', '/championship'])(
    'rejects the removed playerId filter on %s even with a valid UUID',
    async (path) => {
      await request(app.getHttpServer())
        .get(path)
        .query({ playerId: '31f42f42-ef5c-4bbf-9e45-e8577abf1743' })
        .expect(400);
      expect(repository.listWinners).not.toHaveBeenCalled();
      expect(repository.listChampionships).not.toHaveBeenCalled();
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

  it('documents filters and only the public response fields in Swagger', async () => {
    const document = await createApiDocument(
      app,
      new DocumentBuilder().setTitle('Test').build(),
    );
    const operation = document.paths['/award/winners'].get;
    expect(
      operation.parameters.map((p) => ('name' in p ? p.name : '')).sort(),
    ).toEqual(['award', 'limit', 'page', 'team', 'year']);
    expect(
      document.paths['/championship'].get.parameters
        .map((p) => ('name' in p ? p.name : ''))
        .sort(),
    ).toEqual(['limit', 'page', 'team', 'year']);
    for (const path of ['/award/winners', '/championship']) {
      for (const name of ['page', 'limit']) {
        const parameter = document.paths[path].get.parameters.find(
          (p) => 'name' in p && p.name === name,
        );
        expect(parameter).toMatchObject({
          required: false,
          schema: { type: 'number' },
        });
        expect(parameter).not.toHaveProperty('example');
        expect(parameter).not.toHaveProperty('schema.default');
      }
    }
    const schemas = document.components.schemas;
    const expectedFields = {
      AwardViewModel: ['code', 'name'],
      CatalogItemViewModel: ['code', 'name'],
      AwardWinnerViewModel: ['player', 'team', 'year'],
      ChampionshipViewModel: ['team', 'year'],
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
    for (const name of [
      'AwardWinnersPageViewModel',
      'ChampionshipsPageViewModel',
    ]) {
      expect(schemas[name]).toHaveProperty('properties.page.nullable', true);
      expect(schemas[name]).toHaveProperty('properties.limit.nullable', true);
    }
  });

  it('uses database catalog codes as optional dropdowns without preselected filters', async () => {
    repository.listAwards.mockResolvedValueOnce([
      { id: 'award-id', code: 'DPOY', name: 'Defensive Player of the Year' },
      { id: 'another-award-id', code: 'MVP', name: 'Most Valuable Player' },
    ]);
    repository.listTeams.mockResolvedValueOnce([
      { id: 'historical-team-id', code: 'BAL-1947', name: 'Baltimore Bullets' },
      { id: 'team-id', code: 'CHI', name: 'Chicago Bulls' },
    ]);
    const document = await createApiDocument(
      app,
      new DocumentBuilder().setTitle('Test').build(),
    );
    for (const [path, filter, codes] of [
      ['/award/winners', 'award', ['DPOY', 'MVP']],
      ['/award/winners', 'team', ['BAL-1947', 'CHI']],
      ['/championship', 'team', ['BAL-1947', 'CHI']],
    ] as const) {
      const parameter = document.paths[path].get.parameters.find(
        (p) => 'name' in p && p.name === filter,
      );
      expect(parameter).toMatchObject({
        in: 'query',
        required: false,
        schema: { type: 'string', enum: codes },
      });
      expect(parameter).not.toHaveProperty('example');
      expect(parameter).not.toHaveProperty('schema.default');
    }
  });

  it('does not invent dropdown options when the database has no catalog', async () => {
    repository.listAwards.mockResolvedValueOnce([]);
    repository.listTeams.mockResolvedValueOnce([]);
    const document = await createApiDocument(
      app,
      new DocumentBuilder().setTitle('Test').build(),
    );
    for (const path of ['/award/winners', '/championship']) {
      for (const parameter of document.paths[path].get.parameters) {
        if ('name' in parameter && ['award', 'team'].includes(parameter.name)) {
          expect(parameter).toMatchObject({
            required: false,
            schema: { type: 'string', enum: [] },
          });
        }
      }
    }
  });
});

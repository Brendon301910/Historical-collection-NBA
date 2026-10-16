import { INestApplication } from '@nestjs/common';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { HistoryQueries } from '../../application/use-cases/history/history-queries.usecase';

export async function createApiDocument(
  app: INestApplication,
  config: Omit<OpenAPIObject, 'paths'>,
): Promise<OpenAPIObject> {
  const queries = app.get(HistoryQueries);
  const [awards, teams] = await Promise.all([
    queries.listAwards(),
    queries.listTeams(),
  ]);
  const choices = {
    award: awards.map((award) => award.code),
    team: teams.map((team) => team.code),
  };
  const document = SwaggerModule.createDocument(app, config);

  // Swagger UI renders enum query parameters as dropdowns. Read the same
  // catalogs used by the API so new awards and historical teams stay available.
  for (const path of ['/award/winners', '/championship']) {
    for (const parameter of document.paths[path].get.parameters ?? []) {
      if (
        'name' in parameter &&
        parameter.in === 'query' &&
        (parameter.name === 'award' || parameter.name === 'team')
      ) {
        parameter.schema = { type: 'string', enum: choices[parameter.name] };
      }
    }
  }

  return document;
}

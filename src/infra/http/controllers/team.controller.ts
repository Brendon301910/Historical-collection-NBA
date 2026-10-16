import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HistoryQueries } from '../../../application/use-cases/history/history-queries.usecase';
import { CatalogItemViewModel } from '../view-models/history-view-model';

@ApiTags('Team')
@Controller('team')
export class TeamController {
  constructor(private readonly queries: HistoryQueries) {}

  @Get()
  @ApiOperation({
    summary: 'Lista franquias com seus nomes atuais e códigos para os filtros',
  })
  @ApiOkResponse({ type: CatalogItemViewModel, isArray: true })
  async list(): Promise<CatalogItemViewModel[]> {
    return (await this.queries.listTeams()).map(CatalogItemViewModel.toHttp);
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { HistoryQueries } from '../../../application/use-cases/history/history-queries.usecase';
import { HistoryQuery } from '../dtos/history-query';
import { ChampionshipsPageViewModel } from '../view-models/history-view-model';

@ApiTags('Championship')
@Controller('championship')
export class ChampionshipController {
  constructor(private readonly queries: HistoryQueries) {}

  @Get()
  @ApiOperation({
    summary: 'Lista campeões, vices e placares das finais',
    description:
      'Ano corresponde ao final da temporada. O filtro team seleciona títulos conquistados, sem incluir participações como vice.',
  })
  @ApiOkResponse({ type: ChampionshipsPageViewModel })
  @ApiBadRequestResponse({
    description: 'Filtro inválido ou time desconhecido.',
  })
  list(@Query() query: HistoryQuery) {
    return this.queries.listChampionships(query);
  }
}

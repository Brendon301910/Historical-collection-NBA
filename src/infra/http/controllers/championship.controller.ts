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
    summary: 'Lista nomes dos times campeões',
    description:
      'Cada item contém somente o nome histórico do time campeão e representa um título; o mesmo time pode aparecer várias vezes. Ano corresponde ao final da temporada. O filtro team seleciona títulos conquistados, sem incluir participações como vice.',
  })
  @ApiOkResponse({ type: ChampionshipsPageViewModel })
  @ApiBadRequestResponse({
    description: 'Filtro inválido ou time desconhecido.',
  })
  async list(
    @Query() query: HistoryQuery,
  ): Promise<ChampionshipsPageViewModel> {
    return ChampionshipsPageViewModel.toHttp(
      await this.queries.listChampionships(query),
    );
  }
}

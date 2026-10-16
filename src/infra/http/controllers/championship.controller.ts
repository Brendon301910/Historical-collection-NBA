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
    summary: 'Lista times campeões e anos dos títulos',
    description:
      'Cada item contém o nome atual da franquia (com o nome da época entre parênteses quando diferente) e o ano do título. Ano corresponde ao final da temporada. O filtro team reúne os títulos das identidades da franquia, sem incluir participações como vice.',
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

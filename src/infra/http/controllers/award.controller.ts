import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { HistoryQueries } from '../../../application/use-cases/history/history-queries.usecase';
import { AwardWinnersQuery } from '../dtos/history-query';
import {
  AwardViewModel,
  AwardWinnersPageViewModel,
} from '../view-models/history-view-model';

@ApiTags('Award')
@Controller('award')
export class AwardController {
  constructor(private readonly queries: HistoryQueries) {}

  @Get()
  @ApiOperation({ summary: 'Lista categorias de premiação disponíveis' })
  @ApiOkResponse({ type: AwardViewModel, isArray: true })
  list() {
    return this.queries.listAwards();
  }

  @Get('winners')
  @ApiOperation({
    summary: 'Consulta conquistas por prêmio, ano, time e jogador',
    description:
      'Filtros combinam-se por interseção. Cada item é uma conquista; empates retornam vários itens. Histórico inclui jogadores excluídos logicamente.',
  })
  @ApiOkResponse({ type: AwardWinnersPageViewModel })
  @ApiBadRequestResponse({
    description: 'Filtro inválido ou código desconhecido.',
  })
  winners(@Query() query: AwardWinnersQuery) {
    return this.queries.listWinners(query);
  }
}

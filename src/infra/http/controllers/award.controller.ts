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
  async list(): Promise<AwardViewModel[]> {
    return (await this.queries.listAwards()).map(AwardViewModel.toHttp);
  }

  @Get('winners')
  @ApiOperation({
    summary: 'Consulta conquistas por prêmio, ano e time',
    description:
      'Retorna jogador, nome atual da franquia (com o nome da época entre parênteses quando diferente) e ano final da temporada. O filtro team reúne as identidades da franquia. Filtros combinam-se por interseção. Cada item é uma conquista; empates retornam vários itens. Sem o filtro award, conquistas em categorias diferentes podem ter os mesmos campos. Histórico inclui jogadores excluídos logicamente.',
  })
  @ApiOkResponse({ type: AwardWinnersPageViewModel })
  @ApiBadRequestResponse({
    description: 'Filtro inválido ou código desconhecido.',
  })
  async winners(
    @Query() query: AwardWinnersQuery,
  ): Promise<AwardWinnersPageViewModel> {
    return AwardWinnersPageViewModel.toHttp(
      await this.queries.listWinners(query),
    );
  }
}

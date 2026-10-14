import { ApiProperty } from '@nestjs/swagger';
import {
  AwardSummary,
  AwardWinnerResult,
  ChampionshipResult,
  Page,
  TeamSummary,
} from '../../../application/contracts/repositories/history-repository.contract';

export class CatalogItemViewModel {
  @ApiProperty({ example: 'CHI' })
  code: string;

  @ApiProperty()
  name: string;

  static toHttp(item: TeamSummary | AwardSummary): CatalogItemViewModel {
    return { code: item.code, name: item.name };
  }
}

export class AwardViewModel extends CatalogItemViewModel {
  @ApiProperty({ example: 'MVP' })
  code: string;
}

export class AwardWinnerViewModel {
  @ApiProperty({ example: 'Michael Jordan' })
  player: string;

  @ApiProperty({ example: 'Chicago Bulls' })
  team: string;

  @ApiProperty({ example: 1998, description: 'Ano final da temporada.' })
  year: number;

  static toHttp(winner: AwardWinnerResult): AwardWinnerViewModel {
    return {
      player: winner.player.name,
      team: winner.team.name,
      year: winner.season.end_year,
    };
  }
}

export class ChampionshipViewModel {
  @ApiProperty({
    example: 'Chicago Bulls',
    description: 'Nome histórico do time campeão.',
  })
  team: string;

  static toHttp(championship: ChampionshipResult): ChampionshipViewModel {
    return { team: championship.champion.name };
  }
}

class PageViewModel {
  @ApiProperty({ example: 80 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}

export class AwardWinnersPageViewModel extends PageViewModel {
  @ApiProperty({ type: [AwardWinnerViewModel] })
  data: AwardWinnerViewModel[];

  static toHttp(page: Page<AwardWinnerResult>): AwardWinnersPageViewModel {
    return {
      data: page.data.map(AwardWinnerViewModel.toHttp),
      total: page.total,
      page: page.page,
      limit: page.limit,
    };
  }
}

export class ChampionshipsPageViewModel extends PageViewModel {
  @ApiProperty({ type: [ChampionshipViewModel] })
  data: ChampionshipViewModel[];

  static toHttp(page: Page<ChampionshipResult>): ChampionshipsPageViewModel {
    return {
      data: page.data.map(ChampionshipViewModel.toHttp),
      total: page.total,
      page: page.page,
      limit: page.limit,
    };
  }
}

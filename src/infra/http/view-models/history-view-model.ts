import { ApiProperty } from '@nestjs/swagger';

export class CatalogItemViewModel {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'CHI' })
  code: string;

  @ApiProperty()
  name: string;
}

export class AwardViewModel extends CatalogItemViewModel {
  @ApiProperty({ example: 'MVP' })
  code: string;
}

export class SeasonViewModel {
  @ApiProperty({ example: 1997 })
  start_year: number;

  @ApiProperty({ example: 1998 })
  end_year: number;
}

export class WinnerPlayerViewModel {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Michael Jordan' })
  name: string;
}

export class AwardWinnerViewModel {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: AwardViewModel })
  award: AwardViewModel;

  @ApiProperty({ type: SeasonViewModel })
  season: SeasonViewModel;

  @ApiProperty({ type: WinnerPlayerViewModel })
  player: WinnerPlayerViewModel;

  @ApiProperty({ type: CatalogItemViewModel })
  team: CatalogItemViewModel;

  @ApiProperty({ format: 'uri' })
  source_url: string;
}

export class ChampionshipViewModel {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: SeasonViewModel })
  season: SeasonViewModel;

  @ApiProperty({ type: CatalogItemViewModel })
  champion: CatalogItemViewModel;

  @ApiProperty({ type: CatalogItemViewModel })
  runner_up: CatalogItemViewModel;

  @ApiProperty({ example: 4 })
  champion_wins: number;

  @ApiProperty({ example: 2 })
  runner_up_wins: number;

  @ApiProperty({ format: 'uri' })
  source_url: string;
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
}

export class ChampionshipsPageViewModel extends PageViewModel {
  @ApiProperty({ type: [ChampionshipViewModel] })
  data: ChampionshipViewModel[];
}

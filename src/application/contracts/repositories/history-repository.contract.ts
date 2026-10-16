export interface Page<T> {
  data: T[];
  total: number;
  page: number | null;
  limit: number | null;
}

export interface HistoryFilters {
  year?: number;
  team?: string;
  page?: number;
  limit?: number;
}

export interface AwardFilters extends HistoryFilters {
  award?: string;
}

export interface AwardSummary {
  id: string;
  code: string;
  name: string;
}

export interface TeamSummary {
  id: string;
  code: string;
  name: string;
}

export interface SeasonSummary {
  start_year: number;
  end_year: number;
}

export interface AwardWinnerResult {
  id: string;
  award: AwardSummary;
  season: SeasonSummary;
  player: { id: string; name: string };
  team: TeamSummary;
  source_url: string;
}

export interface ChampionshipResult {
  id: string;
  season: SeasonSummary;
  champion: TeamSummary;
  runner_up: TeamSummary;
  champion_wins: number;
  runner_up_wins: number;
  source_url: string;
}

export abstract class IHistoryRepository {
  abstract listAwards(): Promise<AwardSummary[]>;
  abstract listTeams(): Promise<TeamSummary[]>;
  abstract listWinners(filters: AwardFilters): Promise<Page<AwardWinnerResult>>;
  abstract listChampionships(
    filters: HistoryFilters,
  ): Promise<Page<ChampionshipResult>>;
}

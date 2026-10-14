import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AwardFilters,
  HistoryFilters,
  IHistoryRepository,
} from '../../contracts/repositories/history-repository.contract';

@Injectable()
export class HistoryQueries {
  constructor(private readonly repository: IHistoryRepository) {}

  listAwards() {
    return this.repository.listAwards();
  }

  listTeams() {
    return this.repository.listTeams();
  }

  async listWinners(filters: AwardFilters) {
    await this.validateTeam(filters.team);
    if (
      filters.award &&
      !(await this.repository.listAwards()).some(
        (award) => award.code === filters.award,
      )
    ) {
      throw new BadRequestException(
        'Prêmio desconhecido. Consulte GET /award.',
      );
    }
    return this.repository.listWinners(filters);
  }

  async listChampionships(filters: HistoryFilters) {
    await this.validateTeam(filters.team);
    return this.repository.listChampionships(filters);
  }

  private async validateTeam(code?: string): Promise<void> {
    if (
      code &&
      !(await this.repository.listTeams()).some((team) => team.code === code)
    ) {
      throw new BadRequestException('Time desconhecido. Consulte GET /team.');
    }
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AwardFilters,
  HistoryFilters,
  FranchiseSummary,
  IHistoryRepository,
} from '../../contracts/repositories/history-repository.contract';

@Injectable()
export class HistoryQueries {
  constructor(private readonly repository: IHistoryRepository) {}

  listAwards() {
    return this.repository.listAwards();
  }

  async listTeams(): Promise<FranchiseSummary[]> {
    const groups = new Map<string, FranchiseSummary>();
    for (const team of await this.repository.listTeams()) {
      const current = team.franchise ?? team;
      groups.set(current.code, { code: current.code, name: current.name });
    }
    return [...groups.values()].sort(
      (a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code),
    );
  }

  async listWinners(filters: AwardFilters) {
    const team = await this.resolveTeam(filters.team);
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
    return this.repository.listWinners({ ...filters, ...(team && { team }) });
  }

  async listChampionships(filters: HistoryFilters) {
    const team = await this.resolveTeam(filters.team);
    return this.repository.listChampionships({
      ...filters,
      ...(team && { team }),
    });
  }

  private async resolveTeam(code?: string): Promise<string | undefined> {
    if (!code) return undefined;
    const team = (await this.repository.listTeams()).find(
      (team) => team.code === code || team.franchise?.code === code,
    );
    if (!team) {
      throw new BadRequestException('Time desconhecido. Consulte GET /team.');
    }
    return team.franchise?.code ?? team.code;
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AwardFilters,
  HistoryFilters,
  IHistoryRepository,
} from '../../../../application/contracts/repositories/history-repository.contract';
import { PrismaService } from '../prisma.service';

const teamSelect = { id: true, code: true, name: true } as const;
const seasonSelect = { start_year: true, end_year: true } as const;

function pagination(filters: HistoryFilters): {
  page: number | null;
  limit: number | null;
  query: { skip?: number; take?: number };
} {
  if (filters.page === undefined && filters.limit === undefined) {
    return { page: null, limit: null, query: {} };
  }
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  return { page, limit, query: { skip: (page - 1) * limit, take: limit } };
}

@Injectable()
export class PrismaHistoryRepository implements IHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  listAwards() {
    return this.prisma.award.findMany({ orderBy: { code: 'asc' } });
  }

  listTeams() {
    return this.prisma.team.findMany({
      select: teamSelect,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async listWinners(filters: AwardFilters) {
    const { year, team, award } = filters;
    const { page, limit, query } = pagination(filters);
    const where: Prisma.award_winnerWhereInput = {
      ...(year !== undefined && { season: { end_year: year } }),
      ...(team && { team: { code: team } }),
      ...(award && { award: { code: award } }),
    };
    // A historical achievement remains visible when its player is soft-deleted.
    const [data, total] = await this.prisma.$transaction(
      [
        this.prisma.award_winner.findMany({
          where,
          select: {
            id: true,
            award: { select: teamSelect },
            season: { select: seasonSelect },
            player: { select: { id: true, name: true } },
            team: { select: teamSelect },
            source_url: true,
          },
          orderBy: [
            { season: { end_year: 'desc' } },
            { award: { code: 'asc' } },
            { id: 'asc' },
          ],
          ...query,
        }),
        this.prisma.award_winner.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { data, total, page, limit };
  }

  async listChampionships(filters: HistoryFilters) {
    const { year, team } = filters;
    const { page, limit, query } = pagination(filters);
    const where: Prisma.championshipWhereInput = {
      ...(year !== undefined && { season: { end_year: year } }),
      ...(team && { champion: { code: team } }),
    };
    const [data, total] = await this.prisma.$transaction(
      [
        this.prisma.championship.findMany({
          where,
          select: {
            id: true,
            season: { select: seasonSelect },
            champion: { select: teamSelect },
            runner_up: { select: teamSelect },
            champion_wins: true,
            runner_up_wins: true,
            source_url: true,
          },
          orderBy: [{ season: { end_year: 'desc' } }, { id: 'asc' }],
          ...query,
        }),
        this.prisma.championship.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { data, total, page, limit };
  }
}

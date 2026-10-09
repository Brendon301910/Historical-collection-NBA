import { Injectable } from '@nestjs/common';
import { Player } from '../../../../domain/player.entity';
import { IPlayerRepository } from '../../../../application/contracts/repositories/player-repository.contract';
import { PrismaPlayerMapper } from '../mappers/prisma-player-mapper';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaPlayerRepository implements IPlayerRepository {
  constructor(private prisma: PrismaService) {}
  async create(player: Player): Promise<void> {
    const raw = PrismaPlayerMapper.toPrisma(player);
    await this.prisma.player.create({
      data: { ...raw },
    });
  }

  async findMany(): Promise<Player[]> {
    const players = await this.prisma.player.findMany({
      where: { deleted_at: null },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    });

    return players.map((player) => PrismaPlayerMapper.toDomain(player));
  }
}

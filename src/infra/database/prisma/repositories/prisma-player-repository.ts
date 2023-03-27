import { Injectable } from '@nestjs/common';
import { Player } from 'src/Domain/player.entity';
import { IPlayerRepository } from 'src/application/contracts/repositories/player-repository.contract';
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
}

import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { IPlayerRepository } from '../../application/contracts/repositories/player-repository.contract';
import { PrismaPlayerRepository } from './prisma/repositories/prisma-player-repository';
import { IHistoryRepository } from '../../application/contracts/repositories/history-repository.contract';
import { PrismaHistoryRepository } from './prisma/repositories/prisma-history-repository';

@Module({
  providers: [
    PrismaService,
    { provide: IPlayerRepository, useClass: PrismaPlayerRepository },
    { provide: IHistoryRepository, useClass: PrismaHistoryRepository },
  ],
  exports: [IPlayerRepository, IHistoryRepository],
})
export class DatabaseModule {}

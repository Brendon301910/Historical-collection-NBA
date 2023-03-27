import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { IPlayerRepository } from 'src/application/contracts/repositories/player-repository.contract';
import { PrismaPlayerRepository } from './prisma/repositories/prisma-player-repository';

@Module({
  providers: [
    PrismaService,
    { provide: IPlayerRepository, useClass: PrismaPlayerRepository },
  ],
  exports: [IPlayerRepository],
})
export class DatabaseModule {}

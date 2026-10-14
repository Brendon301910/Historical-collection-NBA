import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PlayerController } from './controllers/player.controller';
import { AppController } from './controllers/app.controller';
import { ICreatePlayer } from '../../application/contracts/use-cases/create-player.contract';
import { CreatePlayer } from '../../application/use-cases/player/create-player.usecase';
import { IListPlayers } from '../../application/contracts/use-cases/list-players.contract';
import { ListPlayers } from '../../application/use-cases/player/list-players.usecase';
import { HistoryQueries } from '../../application/use-cases/history/history-queries.usecase';
import { AwardController } from './controllers/award.controller';
import { ChampionshipController } from './controllers/championship.controller';
import { TeamController } from './controllers/team.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    PlayerController,
    AppController,
    AwardController,
    ChampionshipController,
    TeamController,
  ],
  providers: [
    HistoryQueries,
    { provide: ICreatePlayer, useClass: CreatePlayer },
    { provide: IListPlayers, useClass: ListPlayers },
  ],
})
export class HttpModule {}

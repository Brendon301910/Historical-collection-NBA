import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PlayerController } from './controllers/player.controller';
import { AppController } from './controllers/app.controller';
import { ICreatePlayer } from '../../application/contracts/use-cases/create-player.contract';
import { CreatePlayer } from '../../application/use-cases/player/create-player.usecase';

@Module({
  imports: [DatabaseModule],
  controllers: [PlayerController, AppController],
  providers: [{ provide: ICreatePlayer, useClass: CreatePlayer }],
})
export class HttpModule {}

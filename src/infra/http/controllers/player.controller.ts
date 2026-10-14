import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ICreatePlayer } from '../../../application/contracts/use-cases/create-player.contract';
import { IListPlayers } from '../../../application/contracts/use-cases/list-players.contract';
import { CreatePlayerBody } from '../dtos/create-player-body';
import { PlayerViewModel } from '../view-models/player-view-model';

@ApiTags('Player')
@Controller('player')
export class PlayerController {
  constructor(
    private createPlayer: ICreatePlayer,
    private listPlayers: IListPlayers,
  ) {}

  @ApiOperation({ summary: 'List registered players' })
  @ApiOkResponse({ type: PlayerViewModel, isArray: true })
  @Get()
  async list(): Promise<PlayerViewModel[]> {
    const { players } = await this.listPlayers.execute();
    return PlayerViewModel.toHttpList(players);
  }

  @ApiOperation({ summary: 'Create a new player' })
  @ApiCreatedResponse({ type: PlayerViewModel })
  @ApiBadRequestResponse({ description: 'Invalid player data' })
  @Post()
  async create(@Body() body: CreatePlayerBody) {
    const { name, height, yearOfBirth } = body;

    const { player } = await this.createPlayer.execute({
      name,
      height,
      yearOfBirth,
    });
    return PlayerViewModel.toHttp(player);
  }
}

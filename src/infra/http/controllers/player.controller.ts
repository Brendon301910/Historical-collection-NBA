import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ICreatePlayer } from '../../../application/contracts/use-cases/create-player.contract';
import { CreatePlayerBody } from '../dtos/create-player-body';
import { PlayerViewModel } from '../view-models/player-view-model';

@ApiTags('Player')
@Controller('player')
export class PlayerController {
  constructor(private createPlayer: ICreatePlayer) {}

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

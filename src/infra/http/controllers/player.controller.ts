import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ICreatePlayer } from 'src/application/contracts/use-cases/create-player.contract';
import { CreatePLayerBody } from '../dtos/create-player-body';

@ApiTags('Player')
@Controller('player')
export class PlayerController {
  constructor(private createPlayer: ICreatePlayer) {}

  @ApiOperation({ summary: 'Create a new player' })
  @Post()
  async create(@Body() body: CreatePLayerBody) {
    const { name, height, yearOfBirth } = body;

    const { player } = await this.createPlayer.execute({
      name,
      height,
      yearOfBirth,
    });
    return;
  }
}

import { Player } from '../../../Domain/player.entity';
import { ICreatePlayer } from '../../contracts/use-cases/create-player.contract';
import { IPlayerRepository } from '../../contracts/repositories/player-repository.contract';
import { Injectable } from '@nestjs/common';

interface SendPlayerRequest {
  name: string;
  height: string;
  yearOfBirth: number;
  createdAt: Date;
}

interface SendPlayerResponse {
  player: Player;
}

@Injectable()
export class CreatePlayer implements ICreatePlayer {
  constructor(private playerRepository: IPlayerRepository) {}
  async execute(request: SendPlayerRequest): Promise<SendPlayerResponse> {
    const { name, height, yearOfBirth } = request;
    const player = new Player({
      name,
      height,
      yearOfBirth,
      createdAt: new Date(),
    });
    console.log(player);
    await this.playerRepository.create(player);
    return { player };
  }
}

import { Player } from '../../../domain/player.entity';
import {
  ICreatePlayer,
  SendPlayerRequest,
  SendPlayerResponse,
} from '../../contracts/use-cases/create-player.contract';
import { IPlayerRepository } from '../../contracts/repositories/player-repository.contract';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CreatePlayer implements ICreatePlayer {
  constructor(private playerRepository: IPlayerRepository) {}
  async execute(request: SendPlayerRequest): Promise<SendPlayerResponse> {
    const { name, height, yearOfBirth } = request;
    const player = new Player({
      name,
      height,
      yearOfBirth,
    });
    await this.playerRepository.create(player);
    return { player };
  }
}

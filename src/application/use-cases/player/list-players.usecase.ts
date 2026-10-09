import { Injectable } from '@nestjs/common';
import { IPlayerRepository } from '../../contracts/repositories/player-repository.contract';
import {
  IListPlayers,
  ListPlayersResponse,
} from '../../contracts/use-cases/list-players.contract';

@Injectable()
export class ListPlayers implements IListPlayers {
  constructor(private playerRepository: IPlayerRepository) {}

  async execute(): Promise<ListPlayersResponse> {
    const players = await this.playerRepository.findMany();
    return { players };
  }
}

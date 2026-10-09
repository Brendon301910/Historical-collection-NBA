import { Player } from '../../../domain/player.entity';

export interface SendPlayerRequest {
  name: string;
  height: string;
  yearOfBirth: number;
}

export interface SendPlayerResponse {
  player: Player;
}

export abstract class ICreatePlayer {
  abstract execute(request: SendPlayerRequest): Promise<SendPlayerResponse>;
}

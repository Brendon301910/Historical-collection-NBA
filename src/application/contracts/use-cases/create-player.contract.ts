import { Player } from '../../../Domain/player.entity';

interface SendPlayerRequest {
  name: string;
  height: string;
  yearOfBirth: number;
}

interface SendPlayerResponse {
  player: Player;
}

export abstract class ICreatePlayer {
  abstract execute(request: SendPlayerRequest): Promise<SendPlayerResponse>;
}

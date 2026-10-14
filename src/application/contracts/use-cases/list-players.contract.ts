import { Player } from '../../../domain/player.entity';

export interface ListPlayersResponse {
  players: Player[];
}

export abstract class IListPlayers {
  abstract execute(): Promise<ListPlayersResponse>;
}

import { Player } from '../../../Domain/player.entity';

export abstract class IPlayerRepository {
  abstract create(player: Player): Promise<void>;
}

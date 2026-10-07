import { Player } from '../../../domain/player.entity';

export abstract class IPlayerRepository {
  abstract create(player: Player): Promise<void>;
}

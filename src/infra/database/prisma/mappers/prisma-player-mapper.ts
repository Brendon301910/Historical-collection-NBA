import { Player } from 'src/Domain/player.entity';
import { player as RawPLayer } from '@prisma/client';

export class PrismaPlayerMapper {
  static toPrisma(player: Player) {
    const result = {
      id: player.id,
      name: player.name,
      height: player.height,
      year_of_birth: player.yearOfBirth,
      created_at: player.createdAt,
      deleted_at: player.deletedAt,
    };
    return result;
  }

  static toDomain(player: RawPLayer): Player {
    return new Player(
      {
        name: player.name,
        height: player.height,
        yearOfBirth: player.year_of_birth,
      },
      player.id,
    );
  }
}

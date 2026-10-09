import { Player } from '../../../../domain/player.entity';
import { player as RawPlayer, Prisma } from '@prisma/client';

export class PrismaPlayerMapper {
  static toPrisma(player: Player): Prisma.playerUncheckedCreateInput {
    return {
      id: player.id,
      name: player.name,
      height: player.height,
      year_of_birth: player.yearOfBirth,
      created_at: player.createdAt,
      updated_at: player.updatedAt,
      deleted_at: player.deletedAt,
    };
  }

  static toDomain(player: RawPlayer): Player {
    return new Player(
      {
        name: player.name,
        height: player.height,
        yearOfBirth: player.year_of_birth,
        createdAt: player.created_at,
        updatedAt: player.updated_at ?? undefined,
        deletedAt: player.deleted_at ?? undefined,
      },
      player.id,
    );
  }
}

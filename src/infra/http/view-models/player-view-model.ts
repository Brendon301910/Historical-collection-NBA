import { ApiProperty } from '@nestjs/swagger';
import { Player } from '../../../domain/player.entity';

export class PlayerViewModel {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  height: string;

  @ApiProperty({ example: 1963 })
  year_of_birth: number;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  static toHttp(player: Player): PlayerViewModel {
    return {
      id: player.id,
      name: player.name,
      height: player.height,
      year_of_birth: player.yearOfBirth,
      created_at: player.createdAt,
    };
  }

  static toHttpList(players: Player[]): PlayerViewModel[] {
    return players.map((player) => this.toHttp(player));
  }
}

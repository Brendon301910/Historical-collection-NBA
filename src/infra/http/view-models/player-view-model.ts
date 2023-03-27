import { Player } from 'src/Domain/player.entity';

export class PlayerViewModel {
  static toHttp(player: Player) {
    return {
      id: player.id,
      name: player.name,
      year_of_birth: player.yearOfBirth,
      created_at: player.createdAt,
    };
  }

  static toHttpList(player: Player[]) {
    const _players: unknown[] = [];
    player.forEach((_player) => {
      const viewModel = {
        id: _player.id,
        name: _player.name,
        height: _player.height,
        year_of_birth: _player.yearOfBirth,
        created_at: _player.createdAt,
      };
      _players.push(viewModel);
    });
    return _players;
  }
}

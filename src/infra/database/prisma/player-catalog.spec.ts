import { createHash } from 'crypto';
import * as catalog from '../../../../prisma/data/players.json';
import {
  catalogSchema,
  loadPlayerCatalog,
} from '../../../../prisma/player-catalog';

describe('NBA 75 catalog', () => {
  it('contains all 76 players with stable IDs derived from official profiles', () => {
    const players = loadPlayerCatalog();
    expect(players).toHaveLength(76);
    for (const player of players) {
      const bytes = createHash('sha1')
        .update(Buffer.from('6ba7b8119dad11d180b400c04fd430c8', 'hex'))
        .update(player.sourceUrl)
        .digest()
        .subarray(0, 16);
      bytes[6] = (bytes[6] & 0x0f) | 0x50;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      expect(player.id.replace(/-/g, '')).toBe(bytes.toString('hex'));
    }
    expect(players.find((player) => player.nbaId === 893)).toMatchObject({
      name: 'Michael Jordan',
      height: '1.98',
      yearOfBirth: 1963,
    });
  });

  it('rejects incomplete selections', () => {
    expect(() =>
      catalogSchema.parse({ ...catalog, players: catalog.players.slice(1) }),
    ).toThrow();
  });

  it('rejects duplicate players before writing to the database', () => {
    const players = [...catalog.players];
    players[1] = players[0];
    expect(() => catalogSchema.parse({ ...catalog, players })).toThrow();
  });

  it('rejects profiles that do not match the official player identifier', () => {
    const players = catalog.players.map((player, index) =>
      index === 0 ? { ...player, sourceUrl: 'https://example.com' } : player,
    );
    expect(() => catalogSchema.parse({ ...catalog, players })).toThrow();
  });
});

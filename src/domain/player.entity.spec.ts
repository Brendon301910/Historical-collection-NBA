import { Player } from './player.entity';

describe('Player timestamps', () => {
  const props = { name: 'Michael Jordan', height: '1.98', yearOfBirth: 1963 };

  it('generates an ID and creation date without recursive getters', () => {
    const player = new Player(props);

    expect(player.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(player.createdAt).toBeInstanceOf(Date);
    expect(player.updatedAt).toBeUndefined();
    expect(player.deletedAt).toBeUndefined();
  });

  it('preserves dates and ID when restoring an existing player', () => {
    const createdAt = new Date('2020-01-01T00:00:00Z');
    const updatedAt = new Date('2020-02-01T00:00:00Z');
    const deletedAt = new Date('2020-03-01T00:00:00Z');
    const player = new Player(
      { ...props, createdAt, updatedAt, deletedAt },
      'id',
    );

    expect(player.id).toBe('id');
    expect(player.createdAt).toEqual(createdAt);
    expect(player.updatedAt).toEqual(updatedAt);
    expect(player.deletedAt).toEqual(deletedAt);
  });

  it('updates the modification date without changing the creation date', () => {
    const createdAt = new Date('2020-01-01T00:00:00Z');
    const player = new Player({ ...props, createdAt });

    player.update();

    expect(player.createdAt).toEqual(createdAt);
    expect(player.updatedAt).toBeInstanceOf(Date);
    expect(player.updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
  });
});

import { player as RawPlayer } from '@prisma/client';
import { PrismaPlayerMapper } from './prisma-player-mapper';

describe('PrismaPlayerMapper', () => {
  const record: RawPlayer = {
    id: 'c14c74e3-3d29-45d9-ad08-0aceab7a6a33',
    nba_id: null,
    name: 'Michael Jordan',
    height: '1.98',
    year_of_birth: 1963,
    created_at: new Date('2020-01-01T00:00:00Z'),
    updated_at: new Date('2020-02-01T00:00:00Z'),
    deleted_at: new Date('2020-03-01T00:00:00Z'),
  };

  it('round-trips persisted fields without losing timestamps', () => {
    const player = PrismaPlayerMapper.toDomain(record);

    expect(PrismaPlayerMapper.toPrisma(player)).toEqual({
      id: record.id,
      name: record.name,
      height: record.height,
      year_of_birth: record.year_of_birth,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    });
  });

  it('restores nullable timestamps as absent domain values', () => {
    const player = PrismaPlayerMapper.toDomain({
      ...record,
      updated_at: null,
      deleted_at: null,
    });

    expect(player.createdAt).toEqual(record.created_at);
    expect(player.updatedAt).toBeUndefined();
    expect(player.deletedAt).toBeUndefined();
  });
});

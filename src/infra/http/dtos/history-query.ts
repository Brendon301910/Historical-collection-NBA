import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

function integerQuery(value: unknown): unknown {
  return typeof value === 'string' && /^\d+$/.test(value)
    ? Number(value)
    : value;
}

function codeQuery(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class HistoryQuery {
  @ApiPropertyOptional({
    example: 1998,
    minimum: 1947,
    maximum: 9999,
    description: 'Ano final da temporada: 1998 representa 1997–98.',
  })
  @IsOptional()
  @Transform(({ value }) => integerQuery(value))
  @IsInt()
  @Min(1947)
  @Max(9999)
  year?: number;

  @ApiPropertyOptional({
    example: 'CHI',
    description:
      'Código histórico retornado por GET /team. Em campeonatos, filtra o campeão.',
  })
  @IsOptional()
  @Transform(({ value }) => codeQuery(value))
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_-]{1,31}$/)
  team?: string;

  @ApiPropertyOptional({
    type: Number,
    default: 1,
    minimum: 1,
    maximum: 1000000,
  })
  @Transform(({ value }) => integerQuery(value))
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @Transform(({ value }) => integerQuery(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class AwardWinnersQuery extends HistoryQuery {
  @ApiPropertyOptional({
    example: 'MVP',
    description: 'Código retornado por GET /award: MVP, DPOY ou ROY.',
  })
  @IsOptional()
  @Transform(({ value }) => codeQuery(value))
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,31}$/)
  award?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'ID local retornado por GET /player.',
  })
  @IsOptional()
  @IsUUID()
  playerId?: string;
}

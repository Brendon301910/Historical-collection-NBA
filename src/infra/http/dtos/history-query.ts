import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
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
    description:
      'Selecione um código histórico de GET /team ou deixe vazio para todos. Em campeonatos, filtra o campeão.',
  })
  @IsOptional()
  @Transform(({ value }) => codeQuery(value))
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_-]{1,31}$/)
  team?: string;

  @ApiPropertyOptional({
    type: Number,
    description:
      'Página opcional. Sem page e limit, retorna todos os resultados. Se apenas limit for informado, usa página 1.',
    minimum: 1,
    maximum: 1000000,
  })
  @IsOptional()
  @Transform(({ value }) => integerQuery(value))
  @IsInt()
  @Min(1)
  @Max(1000000)
  page?: number;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 100,
    description:
      'Itens por página. Sem page e limit, retorna todos os resultados. Se apenas page for informado, usa 20 itens por página.',
  })
  @IsOptional()
  @Transform(({ value }) => integerQuery(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class AwardWinnersQuery extends HistoryQuery {
  @ApiPropertyOptional({
    description:
      'Selecione um código de GET /award ou deixe vazio para todos os prêmios.',
  })
  @IsOptional()
  @Transform(({ value }) => codeQuery(value))
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,31}$/)
  award?: string;
}

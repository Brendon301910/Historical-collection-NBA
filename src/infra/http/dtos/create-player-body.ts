import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePlayerBody {
  @ApiProperty({ example: 'Michael Jordan', maxLength: 200 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    example: '1.98',
    description: 'Height as text',
    maxLength: 20,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  height: string;

  @ApiProperty({ example: 1963, minimum: 1, maximum: new Date().getFullYear() })
  @IsInt()
  @Min(1)
  @Max(new Date().getFullYear())
  yearOfBirth: number;
}

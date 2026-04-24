import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

import { CosmeticRarity } from '../enums/cosmetic-rarity.enum';
import { CosmeticType } from '../enums/cosmetic-type.enum';

export class CreateCosmeticDto {
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsString()
  @IsNotEmpty()
  cosmeticTitle: string;

  @IsString()
  @IsNotEmpty()
  cosmeticDescription: string;

  @IsEnum(CosmeticRarity)
  cosmeticRarity: CosmeticRarity;

  @IsOptional()
  @IsUUID()
  achievementId?: string | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return Number(value);
  })
  @IsNumber()
  @Min(0)
  price?: number | null;

  @IsEnum(CosmeticType)
  cosmeticType: CosmeticType;
}

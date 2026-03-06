import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

import { CosmeticRarity } from '../enums/cosmetic-rarity.enum';
import { CosmeticType } from '../enums/cosmetic-type.enum';

export class UpdateCosmeticDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  cosmeticTitle?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  cosmeticDescription?: string;

  @IsOptional()
  @IsEnum(CosmeticRarity)
  cosmeticRarity?: CosmeticRarity;

  @IsOptional()
  @IsUUID()
  achievementId?: string | null;

  @IsOptional()
  @IsEnum(CosmeticType)
  cosmeticType?: CosmeticType;
}

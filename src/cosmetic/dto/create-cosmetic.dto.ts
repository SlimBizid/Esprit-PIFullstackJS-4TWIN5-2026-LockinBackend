import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

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

  @IsEnum(CosmeticType)
  cosmeticType: CosmeticType;
}

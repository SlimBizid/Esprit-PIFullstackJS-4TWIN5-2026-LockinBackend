import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AchievementType } from '../enums/achievement-type.enum';

export class CreateAchievementDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(AchievementType)
  type: AchievementType;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsUUID('all', { each: true })
  cosmeticIds?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Array.isArray(value)
      ? value.map((item) => Number(item))
      : [Number(value)];
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  challengeIds?: number[];
}

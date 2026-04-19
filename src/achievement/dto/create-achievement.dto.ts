import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateAchievementDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional() //again, this will prob be removed
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  cosmeticIds?: string[];
}

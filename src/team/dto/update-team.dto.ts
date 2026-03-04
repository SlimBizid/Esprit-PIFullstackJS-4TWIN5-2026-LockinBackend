import {
  IsOptional,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  userIds?: number[];
}

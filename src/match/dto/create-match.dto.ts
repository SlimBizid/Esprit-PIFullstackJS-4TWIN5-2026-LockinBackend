import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import { MatchVisibility } from '../enums/match-visibility.enum';

export class CreateMatchDto {
  @IsInt()
  @Min(1)
  challengeId: number;

  @IsOptional()
  @IsEnum(MatchVisibility)
  visibility?: MatchVisibility = MatchVisibility.PRIVATE;
}

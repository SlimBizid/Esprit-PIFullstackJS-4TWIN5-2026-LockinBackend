import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { MatchVisibility } from 'src/match/enums/match-visibility.enum';

export class CreateImposterMatchDto {
  @IsInt()
  @Min(1)
  challengeId: number;

  @IsOptional()
  @IsEnum(MatchVisibility)
  visibility?: MatchVisibility = MatchVisibility.PRIVATE;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(6)
  maxPlayers?: number = 4;
}

import { IsUUID, IsInt, IsPositive, IsEnum } from 'class-validator';
import { ChallengeDifficulty } from '../../challenge/enums/challenge-difficulty.enums';
import { ChallengeType } from '../../challenge/enums/challenge-type.enums';

export class AwardChallengeDto {
  @IsUUID()
  userId!: string;

  @IsInt()
  @IsPositive()
  challengeId!: number;

  @IsEnum(ChallengeDifficulty)
  difficulty!: ChallengeDifficulty;

  @IsEnum(ChallengeType)
  type!: ChallengeType;
}

import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

import { ChallengeType } from '../enums/challenge-type.enums';

export class GenerateChallengeDraftDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(ChallengeType)
  type: ChallengeType;
}

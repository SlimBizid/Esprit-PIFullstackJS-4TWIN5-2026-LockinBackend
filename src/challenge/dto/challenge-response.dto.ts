import { Expose } from 'class-transformer';
import { ChallengeType } from '../enums/challenge-type.enums';
import { ChallengeDifficulty } from '../enums/challenge-difficulty.enums';
import { ChallengeTopic } from '../enums/challenge-topic.enums';

export class ChallengeResponseDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  content: string;

  @Expose()
  type: ChallengeType;

  @Expose()
  difficulty: ChallengeDifficulty;

  @Expose()
  topics: ChallengeTopic[];

  @Expose()
  acceptanceRate: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

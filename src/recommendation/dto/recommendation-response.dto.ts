import { ChallengeDifficulty } from 'src/challenge/enums/challenge-difficulty.enums';
import { ChallengeType } from 'src/challenge/enums/challenge-type.enums';

export class RecommendationChallengeDto {
  id: number;
  title: string;
  difficulty: ChallengeDifficulty;
  type: ChallengeType;
  topics: string[];
  acceptanceRate: number;
}

export class RecommendationItemDto {
  challengeId: number;
  score: number;
  rank: number;
  reason: string;
  challenge: RecommendationChallengeDto;
}

export class RecommendationResponseDto {
  data: RecommendationItemDto[];
  meta: {
    modelVersion: string;
    generatedAt: string | null;
  };
}

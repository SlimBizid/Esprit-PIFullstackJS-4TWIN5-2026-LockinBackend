import { Expose } from 'class-transformer';
import { ChallengeType } from '../enums/challenge-type.enums';
import { ChallengeDifficulty } from '../enums/challenge-difficulty.enums';
import { ChallengeTopic } from '../enums/challenge-topic.enums';
import { ChallengeCaseDto } from './challenge-case.dto';
import { ChallengeQuizQuestionDto } from './challenge-quiz-question.dto';

export class ChallengeResponseDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  content: string;

  @Expose()
  starterCode: string;

  @Expose()
  starterCodes: Record<string, string>;

  @Expose()
  examples: string[];

  @Expose()
  constraints: string[];

  @Expose()
  conditions: string[];

  @Expose()
  cases: ChallengeCaseDto[];

  @Expose()
  quizQuestions: ChallengeQuizQuestionDto[];

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

import { ChallengeDifficulty } from '../enums/challenge-difficulty.enums';
import { ChallengeType } from '../enums/challenge-type.enums';
import { ChallengeTopic } from '../enums/challenge-topic.enums';

import { ChallengeCaseDto } from './challenge-case.dto';
import { ChallengeQuizQuestionDto } from './challenge-quiz-question.dto';

export class GeneratedChallengeDraftDto {
  title: string;
  content: string;
  starterCode: string;
  starterCodes: Record<string, string>;
  examples: string[];
  constraints: string[];
  conditions: string[];
  cases: ChallengeCaseDto[];
  quizQuestions: ChallengeQuizQuestionDto[];
  difficulty: ChallengeDifficulty;
  type: ChallengeType;
  topics: ChallengeTopic[];
  acceptanceRate: number;
}

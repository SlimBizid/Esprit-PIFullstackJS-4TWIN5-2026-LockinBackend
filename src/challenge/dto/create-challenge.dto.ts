import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ArrayMinSize,
  IsArray,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { ChallengeType } from '../enums/challenge-type.enums';
import { ChallengeDifficulty } from '../enums/challenge-difficulty.enums';
import { ChallengeTopic } from '../enums/challenge-topic.enums';
import { Type } from 'class-transformer';
import { ChallengeCaseDto } from './challenge-case.dto';
import { ChallengeQuizQuestionDto } from './challenge-quiz-question.dto';

export class CreateChallengeDto {
  @IsString()
  @IsNotEmpty({ message: 'A challenge must have a title.' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Challenge content cannot be empty.' })
  content: string;

  @IsString()
  @IsOptional()
  starterCode?: string = '';

  @IsObject()
  @IsOptional()
  starterCodes?: Record<string, string> = {};

  @IsArray()
  @IsString({ each: true })
  @IsOptional() // don't freak out Slim, this is just to make it easier for development, we'll remove it in prod
  examples: string[] = [];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  constraints: string[] = [];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  conditions: string[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChallengeCaseDto)
  @IsOptional()
  cases: ChallengeCaseDto[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChallengeQuizQuestionDto)
  @IsOptional()
  quizQuestions: ChallengeQuizQuestionDto[] = [];

  @IsEnum(ChallengeType, {
    message: 'Type must be one of: ' + Object.values(ChallengeType).join(', '),
  })
  type: ChallengeType;

  @IsEnum(ChallengeDifficulty, {
    message:
      'Difficulty must be one of: ' +
      Object.values(ChallengeDifficulty).join(', '),
  })
  difficulty: ChallengeDifficulty;

  @IsArray()
  @ArrayMinSize(1, { message: 'You must provide at least one topic.' })
  @IsEnum(ChallengeTopic, { each: true, message: 'Invalid topic provided.' })
  topics: ChallengeTopic[];

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  acceptanceRate?: number;

  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
  teamIds?: number[] = [];
}

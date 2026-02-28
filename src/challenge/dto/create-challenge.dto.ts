import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ArrayMinSize,
  IsArray,
} from 'class-validator';
import { ChallengeType } from '../enums/challenge-type.enums';
import { ChallengeDifficulty } from '../enums/challenge-difficulty.enums';
import { ChallengeTopic } from '../enums/challenge-topic.enums';

export class CreateChallengeDto {
  @IsString()
  @IsNotEmpty({ message: 'A challenge must have a title.' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Challenge content cannot be empty.' })
  content: string;

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
}

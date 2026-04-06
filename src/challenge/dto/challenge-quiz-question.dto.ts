import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { ChallengeQuizOptionDto } from './challenge-quiz-option.dto';

export class ChallengeQuizQuestionDto {
  @IsString()
  id: string;

  @IsString()
  prompt: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ChallengeQuizOptionDto)
  options: ChallengeQuizOptionDto[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  correctOptionIds: string[];

  @IsOptional()
  @IsString()
  explanation?: string;
}

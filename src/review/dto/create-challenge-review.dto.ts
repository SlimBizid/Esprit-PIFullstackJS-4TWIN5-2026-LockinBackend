import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChallengeReviewDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  content: string;
}

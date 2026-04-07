import { IsNotEmpty, IsString } from 'class-validator';

export class ChallengeQuizOptionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}

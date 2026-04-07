import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateSubmissionDto {
  @IsInt()
  @Min(1)
  challengeId: number;

  @IsString()
  @IsIn(['javascript', 'typescript', 'python', 'java', 'cpp'])
  language: 'javascript' | 'typescript' | 'python' | 'java' | 'cpp';

  @IsString()
  @IsNotEmpty()
  sourceCode: string;
}

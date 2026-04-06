import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SubmitMatchDto {
  @IsString()
  @IsIn(['javascript', 'typescript', 'python', 'java', 'cpp'])
  language: 'javascript' | 'typescript' | 'python' | 'java' | 'cpp';

  @IsString()
  @IsNotEmpty()
  sourceCode: string;
}

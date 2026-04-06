import { IsIn, IsString, MinLength } from 'class-validator';

export class SubmitImposterMatchDto {
  @IsString()
  @IsIn(['javascript', 'typescript', 'python', 'java', 'cpp'])
  language: 'javascript' | 'typescript' | 'python' | 'java' | 'cpp';

  @IsString()
  @MinLength(1)
  sourceCode: string;
}

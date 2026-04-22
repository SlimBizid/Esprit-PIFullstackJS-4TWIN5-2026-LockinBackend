import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateSubmissionDto {
  @IsInt()
  @Min(1)
  challengeId: number;

  @IsOptional()
  @IsString()
  language?:
    | 'javascript'
    | 'typescript'
    | 'python'
    | 'java'
    | 'cpp'
    | 'quiz'
    | 'css';

  @IsOptional()
  @IsString()
  sourceCode?: string;

  @IsOptional()
  @IsObject()
  answers?: Record<string, string[]>;
}

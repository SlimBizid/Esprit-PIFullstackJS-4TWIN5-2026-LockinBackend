import { IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitMatchDto {
  @IsOptional()
  @IsString()
  language?: 'javascript' | 'typescript' | 'python' | 'java' | 'cpp' | 'quiz';

  @IsOptional()
  @IsString()
  sourceCode?: string;

  @IsOptional()
  @IsObject()
  answers?: Record<string, string[]>;
}

import { IsArray, IsNumber, IsString } from 'class-validator';

export class BulkImportResponseDto {
  @IsNumber()
  successCount: number;

  @IsNumber()
  failureCount: number;

  @IsArray()
  @IsString({ each: true })
  errors: string[];
}

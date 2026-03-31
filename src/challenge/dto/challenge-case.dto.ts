import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { CaseInputDto } from './case-input.dto';

export class ChallengeCaseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaseInputDto)
  inputs: CaseInputDto[];

  @IsString()
  @IsNotEmpty()
  expectedOutput: string;
}

import { IsNotEmpty, IsString } from 'class-validator';

export class CaseInputDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

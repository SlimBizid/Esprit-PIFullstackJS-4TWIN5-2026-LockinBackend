import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ListPublicImposterMatchesDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  challengeId: number;
}

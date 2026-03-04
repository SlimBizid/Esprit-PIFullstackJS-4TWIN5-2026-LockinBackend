import {
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CreateTeamDto {
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  userIds: number[];
}

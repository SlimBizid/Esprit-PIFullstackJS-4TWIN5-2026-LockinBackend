import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTeamDto {
  @IsNotEmpty()
  name: string;

  @IsString()
  leaderId: string;
}

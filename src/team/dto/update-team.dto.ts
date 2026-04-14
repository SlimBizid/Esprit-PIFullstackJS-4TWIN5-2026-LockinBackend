import { IsOptional, IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsUUID()
  leaderId?: string;
}

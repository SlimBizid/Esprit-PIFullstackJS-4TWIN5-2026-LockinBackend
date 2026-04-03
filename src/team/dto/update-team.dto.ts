import { IsOptional, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsIn(['PENDING', 'ACTIVE'])
  status?: 'PENDING' | 'ACTIVE';
}

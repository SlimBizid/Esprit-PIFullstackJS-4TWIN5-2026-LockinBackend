import { IsUUID } from 'class-validator';

export class CreateLeaderboardEntryDto {
  @IsUUID()
  userId!: string;
}
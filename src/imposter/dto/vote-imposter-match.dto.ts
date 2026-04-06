import { IsUUID } from 'class-validator';

export class VoteImposterMatchDto {
  @IsUUID()
  targetUserId: string;
}

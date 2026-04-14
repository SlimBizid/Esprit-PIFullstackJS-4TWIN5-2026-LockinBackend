import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { PendingInvitation } from './entities/pending-invitation.entity';
import { User } from '../user/entities/user.entity';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Team, User, PendingInvitation])],
  providers: [TeamService],
  controllers: [TeamController],
})
export class TeamModule {}

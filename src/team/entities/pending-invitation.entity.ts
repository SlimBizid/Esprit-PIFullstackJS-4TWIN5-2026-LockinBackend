import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Team } from './team.entity';
import { User } from '../../user/entities/user.entity';

@Entity('pending_invitations')
@Unique(['team', 'user'])
export class PendingInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => Team, (team) => team.pendingInvitations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Index()
  @ManyToOne(() => User, (user) => user.pendingInvitations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}

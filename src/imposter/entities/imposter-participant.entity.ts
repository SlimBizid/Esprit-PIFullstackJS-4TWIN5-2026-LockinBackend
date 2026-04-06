import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';

import { ImposterMatch } from './imposter-match.entity';
import { ImposterRole } from '../enums/imposter-role.enum';

@Entity('imposter_match_participants')
@Unique(['matchId', 'userId'])
export class ImposterParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  matchId: string;

  @ManyToOne(() => ImposterMatch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matchId' })
  match: ImposterMatch;

  @Index()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ImposterRole,
    default: ImposterRole.CODER,
  })
  role: ImposterRole;

  @Index()
  @Column('uuid', { nullable: true })
  voteTargetUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'voteTargetUserId' })
  voteTarget: User | null;

  @CreateDateColumn()
  joinedAt: Date;
}

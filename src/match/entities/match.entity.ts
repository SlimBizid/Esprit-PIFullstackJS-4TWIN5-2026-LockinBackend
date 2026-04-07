import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Challenge } from 'src/challenge/entities/challenge.entity';
import { User } from 'src/user/entities/user.entity';

import { MatchStatus } from '../enums/match-status.enum';
import { MatchVisibility } from '../enums/match-visibility.enum';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  challengeId: number;

  @ManyToOne(() => Challenge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challengeId' })
  challenge: Challenge;

  @Index()
  @Column('uuid')
  playerOneId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerOneId' })
  playerOne: User;

  @Index()
  @Column('uuid', { nullable: true })
  playerTwoId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'playerTwoId' })
  playerTwo: User | null;

  @Index()
  @Column('uuid', { nullable: true })
  winnerId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'winnerId' })
  winner: User | null;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.WAITING,
  })
  status: MatchStatus;

  @Column({
    type: 'enum',
    enum: MatchVisibility,
    default: MatchVisibility.PRIVATE,
  })
  visibility: MatchVisibility;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

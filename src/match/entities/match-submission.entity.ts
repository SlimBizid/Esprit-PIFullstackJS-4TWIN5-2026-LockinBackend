import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';

import { Match } from './match.entity';
import { MatchVerdict } from '../enums/match-verdict.enum';

@Entity('match_submissions')
export class MatchSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  matchId: string;

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matchId' })
  match: Match;

  @Index()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  language: string;

  @Column({ type: 'text' })
  sourceCode: string;

  @Column({
    type: 'enum',
    enum: MatchVerdict,
  })
  verdict: MatchVerdict;

  @Column({ type: 'int' })
  passedCount: number;

  @Column({ type: 'int' })
  totalCount: number;

  @Column({ type: 'jsonb', default: [] })
  results: Array<{
    passed: boolean;
    actual: string;
    expected: string;
    runtime: string;
    memoryKb: number | null;
    status: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;
}

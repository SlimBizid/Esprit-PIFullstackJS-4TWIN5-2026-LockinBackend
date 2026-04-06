import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MatchVerdict } from 'src/match/enums/match-verdict.enum';
import { User } from 'src/user/entities/user.entity';

import { ImposterMatch } from './imposter-match.entity';

@Entity('imposter_match_submissions')
export class ImposterSubmission {
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

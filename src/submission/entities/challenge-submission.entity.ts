import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Challenge } from 'src/challenge/entities/challenge.entity';
import { User } from 'src/user/entities/user.entity';
import { MatchVerdict } from 'src/match/enums/match-verdict.enum';

@Entity('challenge_submissions')
export class ChallengeSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int' })
  challengeId: number;

  @ManyToOne(() => Challenge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challengeId' })
  challenge: Challenge;

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

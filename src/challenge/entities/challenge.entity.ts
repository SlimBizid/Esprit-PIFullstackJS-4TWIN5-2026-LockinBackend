import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ChallengeType } from '../enums/challenge-type.enums';
import { ChallengeDifficulty } from '../enums/challenge-difficulty.enums';
import { ChallengeTopic } from '../enums/challenge-topic.enums';
import { Exclude } from 'class-transformer';

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  title: string;

  @Column({ type: 'enum', enum: ChallengeType })
  type: ChallengeType;

  @Column({ type: 'text' })
  content: string;

  @Column('text', { array: true, default: [] })
  examples: string[];

  @Column('text', { array: true, default: [] })
  constraints: string[];

  @Column('text', { array: true, default: [] })
  conditions: string[];

  @Column({ type: 'jsonb', default: [] })
  cases: {
    inputs: { type: string; value: string }[];
    expectedOutput: string;
  }[];

  @Column({ type: 'enum', enum: ChallengeDifficulty })
  difficulty: ChallengeDifficulty;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  acceptanceRate: number;

  @Column({ type: 'enum', enum: ChallengeTopic, array: true, default: [] })
  topics: ChallengeTopic[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @DeleteDateColumn()
  deletedAt: Date;
}

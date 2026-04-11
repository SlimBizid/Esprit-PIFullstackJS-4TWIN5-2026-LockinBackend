import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { PlagiarismFlagStatus } from '../enums/plagiarism-flag-status.enum';

@Entity('plagiarism_flags')
@Unique(['leftSubmissionId', 'rightSubmissionId', 'modelVersion'])
export class PlagiarismFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int' })
  challengeId: number;

  @Column()
  challengeTitle: string;

  @Column()
  challengeDifficulty: string;

  @Column({ type: 'jsonb', default: [] })
  challengeTopics: string[];

  @Column()
  language: string;

  @Column('uuid')
  leftSubmissionId: string;

  @Column('uuid')
  rightSubmissionId: string;

  @Column('uuid')
  leftUserId: string;

  @Column('uuid')
  rightUserId: string;

  @Column()
  leftUsername: string;

  @Column()
  rightUsername: string;

  @Column()
  leftVerdict: string;

  @Column()
  rightVerdict: string;

  @Column({ type: 'text' })
  leftSourceCode: string;

  @Column({ type: 'text' })
  rightSourceCode: string;

  @Column({ type: 'decimal', precision: 6, scale: 5 })
  ruleScore: number;

  @Column({ type: 'decimal', precision: 6, scale: 5 })
  anomalyScore: number;

  @Index()
  @Column({ type: 'decimal', precision: 6, scale: 5 })
  suspicionScore: number;

  @Column({ type: 'decimal', precision: 6, scale: 5 })
  normalizedSimilarity: number;

  @Column({ type: 'decimal', precision: 6, scale: 5 })
  tokenJaccard: number;

  @Column({ type: 'decimal', precision: 6, scale: 5 })
  ngramJaccard: number;

  @Column({ type: 'decimal', precision: 6, scale: 5 })
  lengthRatio: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  hoursGap: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ length: 50 })
  modelVersion: string;

  @Index()
  @Column({
    type: 'enum',
    enum: PlagiarismFlagStatus,
    default: PlagiarismFlagStatus.OPEN,
  })
  status: PlagiarismFlagStatus;

  @Column({ type: 'text', nullable: true })
  adminNotes: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedByAdminId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

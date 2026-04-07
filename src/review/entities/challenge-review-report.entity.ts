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

import { ChallengeReview } from './challenge-review.entity';

@Entity('challenge_review_reports')
@Unique(['reviewId', 'reporterId'])
export class ChallengeReviewReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  reviewId: string;

  @ManyToOne(() => ChallengeReview, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewId' })
  review: ChallengeReview;

  @Index()
  @Column('uuid')
  reporterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @Column({ length: 120 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

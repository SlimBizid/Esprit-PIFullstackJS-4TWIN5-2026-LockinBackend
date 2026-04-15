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

import { ChallengeReviewComment } from './challenge-review-comment.entity';

@Entity('challenge_review_comment_reports')
@Unique(['commentId', 'reporterId'])
export class ChallengeReviewCommentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  commentId: string;

  @ManyToOne(() => ChallengeReviewComment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commentId' })
  comment: ChallengeReviewComment;

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

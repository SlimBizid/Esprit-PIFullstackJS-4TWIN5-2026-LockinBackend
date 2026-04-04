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

@Entity('challenge_review_upvotes')
@Unique(['reviewId', 'userId'])
export class ChallengeReviewUpvote {
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
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}

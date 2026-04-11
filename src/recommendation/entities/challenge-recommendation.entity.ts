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
import { Challenge } from 'src/challenge/entities/challenge.entity';
import { User } from 'src/user/entities/user.entity';

@Entity('challenge_recommendations')
@Unique(['userId', 'challengeId'])
export class ChallengeRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column({ type: 'int' })
  challengeId: number;

  @ManyToOne(() => Challenge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challengeId' })
  challenge: Challenge;

  @Column({ type: 'decimal', precision: 6, scale: 5 })
  score: number;

  @Column({ type: 'int' })
  rank: number;

  @Column({ length: 50 })
  modelVersion: string;

  @Column({ type: 'text', default: '' })
  reason: string;

  @CreateDateColumn()
  generatedAt: Date;
}

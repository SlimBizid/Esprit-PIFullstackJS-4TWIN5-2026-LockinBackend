import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('user_challenge_rewards')
@Unique(['userId', 'challengeId'])
export class UserChallengeReward {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  userId!: string;

  @Index()
  @Column('int')
  challengeId!: number;

  @CreateDateColumn()
  createdAt!: Date;
}

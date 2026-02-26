import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChallengeType } from '../enums/challenge-type.enums';
import { ChallengeDifficulty } from '../enums/challenge-difficulty.enums';
import { Exclude } from 'class-transformer';
import { ChallengeTopic } from '../enums/challenge-topic.enums';

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  challenge_title: string;

  @Column()
  challenge_type: ChallengeType;

  @Column()
  challenge_content: string;

  @Column()
  challenge_difficulty: ChallengeDifficulty;

  @Column({ default: 100 })
  challenge_acceptance_rate: number;

  @Column()
  topics: ChallengeTopic[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @DeleteDateColumn()
  deletedAt: Date;
}

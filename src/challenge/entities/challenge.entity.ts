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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @DeleteDateColumn()
  deletedAt: Date;
}

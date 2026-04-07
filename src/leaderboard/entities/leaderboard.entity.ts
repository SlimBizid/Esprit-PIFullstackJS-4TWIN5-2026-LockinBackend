import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('leaderboard')
export class LeaderboardEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ name: 'userId', unique: true })
  userId!: string;

  @Column({ type: 'int', default: 0 })
  totalScore!: number;

  @Column({ type: 'int', default: 0 })
  challengeCompletions!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginXpAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

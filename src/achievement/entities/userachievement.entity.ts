import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';

import { User } from 'src/user/entities/user.entity';
import { Achievement } from 'src/achievement/entities/achievement.entity';

@Entity('user_achievements')
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.userAchievements, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Achievement, (achievement) => achievement.userAchievements, {
    onDelete: 'CASCADE',
  })
  achievement: Achievement;

  @CreateDateColumn()
  unlockedAt: Date;
}

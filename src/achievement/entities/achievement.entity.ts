import { Cosmetic } from 'src/cosmetic/entities/cosmetic.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserAchievement } from './userachievement.entity';

@Entity('Achievement')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    nullable: true,
  }) /*should be nullable false will leave it nullable for now for dev purposes */
  imageUrl: string;

  @OneToMany(() => Cosmetic, (cosmetic) => cosmetic.achievement, {
    nullable: true,
  }) /* ill leave this nullable, achievements can have no rewards, just can be listed in user profiles */
  Reward: Cosmetic[]; /* (Cosmetic | Pet)[] will change to this later when we implement pets */

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => UserAchievement, (ua) => ua.achievement)
  userAchievements: UserAchievement[];
}

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Cosmetic } from 'src/cosmetic/entities/cosmetic.entity';
import { User } from './user.entity';

@Entity('user_cosmetics')
@Unique(['user', 'cosmetic'])
export class UserCosmetic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.userCosmetics, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Cosmetic, (cosmetic) => cosmetic.userCosmetics, {
    eager: true,
    onDelete: 'CASCADE',
  })
  cosmetic: Cosmetic;

  @Column({ default: false })
  equipped: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Exclude } from 'class-transformer';

import { UserType } from '../enums/user-type.enum';
import { Team } from 'src/team/entities/team.entity';
import { UserAchievement } from 'src/achievement/entities/userachievement.entity';
import { UserCosmetic } from './user-cosmetic.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true }) // removed exculde to read pwds so we can compare hashes, exposing hashed pwds shouldn't be an issue no? anyways users should always be sent back in a DTO
  @Exclude()
  password: string;

  @Column({ nullable: true })
  githubHandle: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @Column({ type: 'int', default: 0 })
  coins: number;

  @Column({ type: 'enum', enum: UserType, default: UserType.PLAYER })
  type: UserType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToMany(() => Team, (team) => team.users)
  teams: Team[];

  @OneToMany(() => UserAchievement, (userach) => userach.user)
  userAchievements: UserAchievement[];

  @OneToMany(() => UserCosmetic, (userCosmetic) => userCosmetic.user)
  userCosmetics: UserCosmetic[];
}

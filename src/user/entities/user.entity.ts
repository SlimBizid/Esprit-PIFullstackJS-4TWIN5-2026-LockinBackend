import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

import { UserType } from '../enums/user-type.enum';
import { Team } from 'src/team/entities/team.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column() // removed exculde to read pwds so we can compare hashes, exposing hashed pwds shouldn't be an issue no? anyways users should always be sent back in a DTO
  @Exclude()
  password: string;

  @Column({ nullable: true })
  githubHandle: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'enum', enum: UserType, default: UserType.PLAYER })
  type: UserType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => Team, (team) => team.users, { nullable: false })
  team: Team;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  name: string;

  @CreateDateColumn()
  teamCreationDate: Date;

  @OneToMany(() => User, (user) => user.team)
  users: User[];
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Index,
  OneToMany,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
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

  @DeleteDateColumn()
  teamDeletionDate: Date;

  @OneToMany(() => User, (user) => user.team)
  users: User[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'leaderId' })
  leaderId: User;

  @Column({ type: 'json', default: [] })
  pendingInvitations: string[];

  @Column({
    type: 'enum',
    enum: ['PENDING', 'ACTIVE'],
    default: 'PENDING',
  })
  status: 'PENDING' | 'ACTIVE';
}

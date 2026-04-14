import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Index,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { PendingInvitation } from './pending-invitation.entity';

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

  @OneToMany(() => User, (user: User) => user.team)
  users: User[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'leaderId' })
  leaderId: User;

  @OneToMany(() => PendingInvitation, (invitation) => invitation.team)
  pendingInvitations: PendingInvitation[];
}

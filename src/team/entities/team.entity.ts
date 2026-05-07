import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Index,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Challenge } from 'src/challenge/entities/challenge.entity';

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

  // ✅ FIXED RELATION
  @ManyToMany(() => User, (user) => user.teams)
  @JoinTable()
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

  @ManyToMany(() => Challenge, (challenge) => challenge.teams)
  challenges: Challenge[];
}

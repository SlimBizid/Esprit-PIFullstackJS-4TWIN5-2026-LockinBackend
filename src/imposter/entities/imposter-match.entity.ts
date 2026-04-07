import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Challenge } from 'src/challenge/entities/challenge.entity';
import { MatchVisibility } from 'src/match/enums/match-visibility.enum';
import { User } from 'src/user/entities/user.entity';

import { ImposterMatchStatus } from '../enums/imposter-match-status.enum';
import { ImposterWinningSide } from '../enums/imposter-winning-side.enum';

@Entity('imposter_matches')
export class ImposterMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  challengeId: number;

  @ManyToOne(() => Challenge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challengeId' })
  challenge: Challenge;

  @Index()
  @Column('uuid')
  hostId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @Index()
  @Column('uuid', { nullable: true })
  imposterId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'imposterId' })
  imposter: User | null;

  @Index()
  @Column('uuid', { nullable: true })
  accusedPlayerId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'accusedPlayerId' })
  accusedPlayer: User | null;

  @Column({
    type: 'enum',
    enum: ImposterMatchStatus,
    default: ImposterMatchStatus.LOBBY,
  })
  status: ImposterMatchStatus;

  @Column({
    type: 'enum',
    enum: MatchVisibility,
    default: MatchVisibility.PRIVATE,
  })
  visibility: MatchVisibility;

  @Column({ type: 'int', default: 4 })
  maxPlayers: number;

  @Column({
    type: 'enum',
    enum: ImposterWinningSide,
    nullable: true,
  })
  winningSide: ImposterWinningSide | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

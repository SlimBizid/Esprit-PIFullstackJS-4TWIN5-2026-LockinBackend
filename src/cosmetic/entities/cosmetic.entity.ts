import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CosmeticRarity } from '../enums/cosmetic-rarity.enum';
import { CosmeticType } from '../enums/cosmetic-type.enum';

@Entity('cosmetics')
export class Cosmetic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ name: 'cosmetic_title' })
  cosmeticTitle: string;

  @Column({ name: 'cosmetic_description' })
  cosmeticDescription: string;

  @Column({
    name: 'cosmetic_rarity',
    type: 'enum',
    enum: CosmeticRarity,
  })
  cosmeticRarity: CosmeticRarity;

  @Column({ name: 'achievement_id', type: 'uuid', nullable: true })
  achievementId: string | null;

  @Column({
    name: 'cosmetic_type',
    type: 'enum',
    enum: CosmeticType,
  })
  cosmeticType: CosmeticType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

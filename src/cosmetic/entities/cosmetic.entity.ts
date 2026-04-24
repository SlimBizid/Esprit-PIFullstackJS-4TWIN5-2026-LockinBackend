import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';

import { CosmeticRarity } from '../enums/cosmetic-rarity.enum';
import { CosmeticType } from '../enums/cosmetic-type.enum';
import { Achievement } from 'src/achievement/entities/achievement.entity';

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

  @ManyToOne(() => Achievement, (achievement) => achievement.Reward, {
    nullable: true,
  })
  achievement: Achievement | null;

  @RelationId((cosmetic: Cosmetic) => cosmetic.achievement)
  achievementId?: string | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  price: number | null;

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

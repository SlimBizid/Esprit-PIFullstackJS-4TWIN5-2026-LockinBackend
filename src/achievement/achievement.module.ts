import { Module } from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { AchievementController } from './achievement.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/userachievement.entity';
import { StorageModule } from 'src/storage/storage.module';
import { CosmeticModule } from 'src/cosmetic/cosmetic.module';
import { Challenge } from 'src/challenge/entities/challenge.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, UserAchievement, Challenge]),
    StorageModule,
    CosmeticModule,
  ],
  controllers: [AchievementController],
  providers: [AchievementService],
  exports: [AchievementService],
})
export class AchievementModule {}

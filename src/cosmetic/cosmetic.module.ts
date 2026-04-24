import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Cosmetic } from './entities/cosmetic.entity';
import { CosmeticController } from './cosmetic.controller';
import { CosmeticService } from './cosmetic.service';
import { Achievement } from 'src/achievement/entities/achievement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cosmetic, Achievement])],
  controllers: [CosmeticController],
  providers: [CosmeticService],
  exports: [CosmeticService],
})
export class CosmeticModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Cosmetic } from './entities/cosmetic.entity';
import { CosmeticController } from './cosmetic.controller';
import { CosmeticService } from './cosmetic.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cosmetic])],
  controllers: [CosmeticController],
  providers: [CosmeticService],
  exports: [CosmeticService],
})
export class CosmeticModule {}

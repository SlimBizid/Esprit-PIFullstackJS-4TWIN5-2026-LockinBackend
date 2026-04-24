import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Achievement } from 'src/achievement/entities/achievement.entity';
import { UserCosmetic } from './entities/user-cosmetic.entity';
import { Cosmetic } from 'src/cosmetic/entities/cosmetic.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Achievement, UserCosmetic, Cosmetic]),
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { User } from 'src/user/entities/user.entity';
import { UserType } from 'src/user/enums/user-type.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Achievement } from './entities/achievement.entity';
import { Repository } from 'typeorm';
import { UserAchievement } from './entities/userachievement.entity';
import { ImageStorageService } from 'src/storage/image-storage.service';
import { CosmeticService } from 'src/cosmetic/cosmetic.service';

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(Achievement)
    private achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private userAchievementRepository: Repository<UserAchievement>,
    private imageStorageService: ImageStorageService,
    private cosmeticService: CosmeticService,
  ) {}
  async create(
    user: User,
    createAchievementDto: CreateAchievementDto,
    image: any,
  ) {
    if (user.type != UserType.ADMIN) {
      throw new UnauthorizedException('Only admin can create an achievement');
    }

    if (!image?.buffer) {
      throw new BadRequestException('Achievement image is required');
    }

    const imageUrl = await this.imageStorageService.uploadImage(
      image,
      'achievements',
    );

    const cosmeticIds = createAchievementDto.cosmeticIds ?? [];
    const conflictingCosmetics =
      await this.cosmeticService.findRewardConflicts(cosmeticIds);

    if (conflictingCosmetics.length > 0) {
      const details = conflictingCosmetics
        .map((cosmetic) => `${cosmetic.cosmeticTitle} (${cosmetic.id})`)
        .join(', ');

      throw new BadRequestException(
        `These cosmetics are already linked to an achievement: ${details}`,
      );
    }

    const achievement = await this.achievementRepository.save({
      name: createAchievementDto.name,
      description: createAchievementDto.description,
      type: createAchievementDto.type,
      imageUrl,
    });

    await this.cosmeticService.assignAchievementToCosmetics(
      cosmeticIds,
      achievement,
    );

    return achievement;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Achievement[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.achievementRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Achievement> {
    const achievement = await this.achievementRepository.findOne({
      where: { id: id },
    });
    if (!achievement)
      throw new NotFoundException('Achievement with that id not found');
    return achievement;
  }

  async update(
    user: User,
    id: string,
    updateAchievementDto: UpdateAchievementDto,
  ) {
    if (user.type != UserType.ADMIN) {
      throw new UnauthorizedException('Only admin can update an achievement');
    }
    const achievement = await this.findOne(id);
    if (achievement) {
      return await this.achievementRepository.update(
        { id: id },
        updateAchievementDto,
      );
    }
  }

  async remove(user: User, id: string) {
    if (user.type != UserType.ADMIN) {
      throw new UnauthorizedException('Only admin can delete an achievement');
    }
    const achievement = await this.findOne(id);
    if (achievement) {
      return await this.achievementRepository.delete({ id: id });
    }
  }

  async awardAchievementToUser(user: User, achievement: Achievement) {
    return await this.userAchievementRepository.save({
      user,
      achievement,
    });
  }
}

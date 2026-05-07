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
import { Challenge } from 'src/challenge/entities/challenge.entity';

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(Achievement)
    private achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private userAchievementRepository: Repository<UserAchievement>,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    private imageStorageService: ImageStorageService,
    private cosmeticService: CosmeticService,
  ) {}

  private async resolveChallenges(challengeIds: number[]): Promise<Challenge[]> {
    if (challengeIds.length === 0) {
      return [];
    }

    const challenges = await this.challengeRepository.find({
      where: challengeIds.map((id) => ({ id })),
    });

    if (challenges.length !== challengeIds.length) {
      const foundIds = new Set(challenges.map((challenge) => challenge.id));
      const missingId = challengeIds.find((id) => !foundIds.has(id));
      throw new NotFoundException(`Challenge ${missingId} not found`);
    }

    return challenges;
  }

  private serializeAchievement(achievement: Achievement) {
    return {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      type: achievement.type,
      imageUrl: achievement.imageUrl,
      createdAt: achievement.createdAt,
      rewards: (achievement.Reward ?? []).map((cosmetic) => ({
        id: cosmetic.id,
        cosmeticTitle: cosmetic.cosmeticTitle,
      })),
      challenges: (achievement.challenges ?? []).map((challenge) => ({
        id: challenge.id,
        title: challenge.title,
        type: challenge.type,
        difficulty: challenge.difficulty,
      })),
    };
  }

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
    const challengeIds = createAchievementDto.challengeIds ?? [];
    const conflictingCosmetics =
      await this.cosmeticService.findRewardConflicts(cosmeticIds);
    const challenges = await this.resolveChallenges(challengeIds);

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
      challenges,
    });

    await this.cosmeticService.assignAchievementToCosmetics(
      cosmeticIds,
      achievement,
    );

    return this.findOne(achievement.id);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: ReturnType<AchievementService['serializeAchievement']>[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.achievementRepository.findAndCount({
      skip,
      take: limit,
      relations: ['Reward', 'challenges'],
      order: { createdAt: 'DESC' },
    });
    return {
      data: data.map((achievement) => this.serializeAchievement(achievement)),
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const achievement = await this.achievementRepository.findOne({
      where: { id: id },
      relations: ['Reward', 'challenges'],
    });
    if (!achievement)
      throw new NotFoundException('Achievement with that id not found');
    return this.serializeAchievement(achievement);
  }

  async update(
    user: User,
    id: string,
    updateAchievementDto: UpdateAchievementDto,
  ) {
    if (user.type != UserType.ADMIN) {
      throw new UnauthorizedException('Only admin can update an achievement');
    }
    await this.findOne(id);
    const achievement = await this.achievementRepository.findOne({
      where: { id },
      relations: ['challenges'],
    });

    if (!achievement) {
      throw new NotFoundException('Achievement with that id not found');
    }

    const { cosmeticIds: _cosmeticIds, challengeIds, ...rest } =
      updateAchievementDto;

    Object.assign(achievement, rest);

    if (challengeIds !== undefined) {
      achievement.challenges = await this.resolveChallenges(challengeIds);
    }

    await this.achievementRepository.save(achievement);

    return this.findOne(id);
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

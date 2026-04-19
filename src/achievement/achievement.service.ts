import {
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

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(Achievement)
    private achievementRepository: Repository<Achievement>,
  ) {}
  async create(user: User, createAchievementDto: CreateAchievementDto) {
    if (user.type != UserType.ADMIN) {
      throw new UnauthorizedException('Only admin can create an achievement');
    }
    return await this.achievementRepository.save(createAchievementDto);
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
}

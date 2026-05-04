import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { UserType } from './enums/user-type.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { Achievement } from 'src/achievement/entities/achievement.entity';
import { UserCosmetic } from './entities/user-cosmetic.entity';
import { Cosmetic } from 'src/cosmetic/entities/cosmetic.entity';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Achievement)
    private achievementRepository: Repository<Achievement>,
    @InjectRepository(UserCosmetic)
    private userCosmeticRepository: Repository<UserCosmetic>,
    @InjectRepository(Cosmetic)
    private cosmeticRepository: Repository<Cosmetic>,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { username },
    });
  }

  async updateUser(user: User, updatedUser: UpdateUserDto): Promise<string> {
    if (updatedUser.username) {
      if (
        (await this.findUsernameExists(updatedUser.username)) &&
        updatedUser.username != user.username
      ) {
        throw new BadRequestException('This username is already taken');
      }
    }
    if (await bcrypt.compare(updatedUser.password, user.password)) {
      const newpass = await bcrypt.hash(updatedUser.password, 10);
      updatedUser.password = newpass;
      // i tried repo.update(user.id,updatedUser) and it didnt work, some issue with querybuilder inside idk? gotta do this stupid implementation instead
      await this.userRepository.update(user.id, {
        username: updatedUser.username,
        password: updatedUser.password,
        email: updatedUser.email,
        githubHandle: updatedUser.githubHandle,
      });
      return 'User updated';
    } else {
      throw new BadRequestException('Invalid password');
    }
  }

  async changePassword(
    user: User,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const persistedUser = await this.findById(user.id);

    if (!persistedUser) {
      throw new NotFoundException('User not found');
    }

    if (persistedUser.githubHandle && !persistedUser.password) {
      throw new BadRequestException(
        'GitHub-only accounts cannot update password here',
      );
    }

    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      persistedUser.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      persistedUser.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from your current password',
      );
    }

    persistedUser.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(persistedUser);

    return { message: 'Password updated successfully' };
  }
  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  async validatePassword(
    user: User,
    plaintextPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(plaintextPassword, user.password);
  }
  async getAllAchievementsWithStatus(username: string) {
    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const achievements = await this.achievementRepository.find({
      relations: [
        'userAchievements',
        'userAchievements.user',
        'Reward',
        'challenges',
      ],
      order: { createdAt: 'ASC' },
    });

    return achievements.map((achievement) => {
      const userAchievement = achievement.userAchievements.find(
        (ua) => ua.user.id === user.id,
      );

      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        type: achievement.type,
        imageUrl: achievement.imageUrl,
        createdAt: achievement.createdAt,
        rewards: achievement.Reward ?? [],
        challenges: (achievement.challenges ?? []).map((challenge) => ({
          id: challenge.id,
          title: challenge.title,
          type: challenge.type,
          difficulty: challenge.difficulty,
        })),
        unlocked: !!userAchievement,
        unlockedAt: userAchievement?.unlockedAt ?? null,
      };
    });
  }
  async findUsernameExists(username: string): Promise<boolean> {
    const user = await this.userRepository.findOneBy({ username });
    if (user) {
      return true;
    } else {
      return false;
    }
  }
  async findEmailExists(email: string): Promise<boolean> {
    const user = await this.userRepository.findOneBy({ email });
    if (user) {
      return true;
    } else {
      return false;
    }
  }
  async CreateUser(
    username: string,
    email: string,
    plaintextpassword?: string,
    githubHandle?: string,
  ) {
    if (await this.findUsernameExists(username)) {
      throw new HttpException('Username already exists', HttpStatus.CONFLICT);
    }
    if (await this.findEmailExists(email)) {
      throw new HttpException('Email already exists', HttpStatus.CONFLICT);
    }
    let password: string | undefined = undefined;
    if (plaintextpassword) {
      password = await bcrypt.hash(plaintextpassword, 10);
    }
    return await this.userRepository.save({
      username,
      email,
      password,
      githubHandle,
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    role: string,
    type?: UserType,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (type) where.type = type;

    const normalizedSearch = search?.trim();

    if (normalizedSearch) {
      where.username = ILike(`%${normalizedSearch}%`);
    }

    const [users, total] = await this.userRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const data = users.map((user) => {
      if (role === 'admin') {
        return user;
      }
      return {
        id: user.id,
        username: user.username,
        githubHandle: user.githubHandle,
        type: user.type,
      };
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async updateUserRole(id: string, updated_role: UserType) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) throw new NotFoundException(`Couldn't find user ${id}`);

    user.type = updated_role;
    return this.userRepository.save(user);
  }

  async softRemove(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Couldn't find user ${id}`);
    return this.userRepository.softRemove(user);
  }

  async restore(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!user) throw new NotFoundException(`Couldn't find user ${id}`);
    if (!user.deletedAt) {
      throw new BadRequestException('User is not deleted');
    }
    await this.userRepository.restore(id);
    return this.userRepository.findOne({ where: { id } });
  }

  async getProfile(
    username: string,
  ): Promise<Record<string, unknown> | string> {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['userCosmetics', 'userCosmetics.cosmetic'],
    });

    if (!user) {
      return "User with this username doesn't exist";
    }

    return {
      id: user.id,
      username: user.username,
      githubHandle: user.githubHandle,
      email: user.email,
      type: user.type,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      xp: user.xp,
      cosmetics: user.userCosmetics.map((userCosmetic) => ({
        ...userCosmetic.cosmetic,
        equipped: userCosmetic.equipped,
      })),
    };
  }

  async grantCosmeticToUser(
    requester: User,
    userId: string,
    cosmeticId: string,
  ): Promise<UserCosmetic> {
    if (requester.type !== UserType.ADMIN) {
      throw new BadRequestException('Only admin can grant cosmetics');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const cosmetic = await this.cosmeticRepository.findOne({
      where: { id: cosmeticId },
    });
    if (!cosmetic) {
      throw new NotFoundException('Cosmetic not found');
    }

    const existing = await this.userCosmeticRepository.findOne({
      where: {
        user: { id: user.id },
        cosmetic: { id: cosmetic.id },
      },
      relations: ['user', 'cosmetic'],
    });

    if (existing) {
      return existing;
    }

    return this.userCosmeticRepository.save({
      user,
      cosmetic,
      equipped: false,
    });
  }

  async equipCosmetic(user: User, cosmeticId: string): Promise<UserCosmetic> {
    const ownedCosmetic = await this.userCosmeticRepository.findOne({
      where: {
        user: { id: user.id },
        cosmetic: { id: cosmeticId },
      },
      relations: ['user', 'cosmetic'],
    });

    if (!ownedCosmetic) {
      throw new NotFoundException('User does not own this cosmetic');
    }

    const sameTypeCosmetics = await this.userCosmeticRepository.find({
      where: {
        user: { id: user.id },
      },
      relations: ['cosmetic'],
    });

    const matchingTypeOwnerships = sameTypeCosmetics.filter(
      (userCosmetic) =>
        userCosmetic.cosmetic.cosmeticType ===
        ownedCosmetic.cosmetic.cosmeticType,
    );

    await this.userCosmeticRepository.save(
      matchingTypeOwnerships.map((userCosmetic) => ({
        ...userCosmetic,
        equipped: userCosmetic.id === ownedCosmetic.id,
      })),
    );

    const updatedOwnership = await this.userCosmeticRepository.findOne({
      where: { id: ownedCosmetic.id },
      relations: ['user', 'cosmetic'],
    });

    if (!updatedOwnership) {
      throw new NotFoundException('Equipped cosmetic could not be loaded');
    }

    return updatedOwnership;
  }
}

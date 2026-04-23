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

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Achievement)
    private achievementRepository: Repository<Achievement>,
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
      relations: ['userAchievements', 'userAchievements.user'],
    });

    return achievements.map((achievement) => {
      const userAchievement = achievement.userAchievements.find(
        (ua) => ua.user.id === user.id,
      );

      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        imageUrl: achievement.imageUrl,
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

    if (search) where.username = ILike(`%${search}%`);

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

  async getProfile(username: string): Promise<User | string> {
    const user = await this.findByUsername(username);
    if (!user) {
      return "User with this username doesn't exist";
    }
    return user;
  }
}

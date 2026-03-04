import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { User } from '../user/entities/user.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createTeam(dto: CreateTeamDto): Promise<Team> {
    const { name, userIds } = dto;

    if (userIds.length < 2 || userIds.length > 5) {
      throw new BadRequestException('A team must have 2 to 5 users');
    }

    const users = await this.userRepository.findByIds(userIds);
    if (users.length !== userIds.length) {
      throw new BadRequestException('Some user IDs are invalid');
    }

    const team = this.teamRepository.create({ name, users });
    return this.teamRepository.save(team);
  }

  async findAll(): Promise<Team[]> {
    return this.teamRepository.find({ relations: ['users'] });
  }

  async findOne(id: number): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async updateTeam(id: number, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.findOne(id);

    if (dto.name) {
      team.name = dto.name;
    }

    if (dto.userIds) {
      if (dto.userIds.length < 2 || dto.userIds.length > 5) {
        throw new BadRequestException('A team must have 2 to 5 users');
      }
      const users = await this.userRepository.findByIds(dto.userIds);
      if (users.length !== dto.userIds.length) {
        throw new BadRequestException('Some user IDs are invalid');
      }
      team.users = users;
    }

    return this.teamRepository.save(team);
  }

  async deleteTeam(id: number): Promise<void> {
    const team = await this.findOne(id);
    await this.teamRepository.remove(team);
  }

  async addUser(id: number, userId: number): Promise<Team> {
    const team = await this.findOne(id);
    if (team.users.length >= 5) {
      throw new BadRequestException('Team already has maximum 5 users');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId.toString() },
    });
    if (!user) throw new NotFoundException('User not found');

    if (team.users.find((u) => u.id === user.id)) {
      throw new BadRequestException('User already in team');
    }

    team.users.push(user);
    return this.teamRepository.save(team);
  }

  async removeUser(id: number, userId: string): Promise<Team> {
    const team = await this.findOne(id);
    if (team.users.length <= 2) {
      throw new BadRequestException('Team must have at least 2 users');
    }
    if (team.users.find((u) => u.id === userId)) {
      team.users = team.users.filter((u) => u.id !== userId.toString());
      return this.teamRepository.save(team);
    }
    throw new BadRequestException('User not in the team');
  }
}

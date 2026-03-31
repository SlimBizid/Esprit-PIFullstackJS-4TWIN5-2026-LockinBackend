import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { User } from '../user/entities/user.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { type Request } from 'express';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createTeam(dto: CreateTeamDto, leaderId: string): Promise<Team> {
    const leader = await this.userRepository.findOne({
      where: { id: leaderId },
    });
    if (!leader) throw new NotFoundException('Leader not found');

    const team = this.teamRepository.create({
      name: dto.name,
      leaderId: leader,
      users: [leader],
      pendingInvitations: [],
      status: 'PENDING',
    });

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
    if (dto.name) team.name = dto.name;
    return this.teamRepository.save(team);
  }

  async deleteTeam(id: number): Promise<void> {
    const team = await this.findOne(id);
    await this.teamRepository.remove(team);
  }

  async inviteUser(teamId: number, userId: string): Promise<Team> {
    const team = await this.findOne(teamId);

    if (team.pendingInvitations.includes(userId))
      throw new BadRequestException('User already invited');

    team.pendingInvitations.push(userId);
    return this.teamRepository.save(team);
  }

  async acceptInvitation(teamId: number, userId: string): Promise<Team> {
    const team = await this.findOne(teamId);

    if (!team.pendingInvitations.includes(userId))
      throw new BadRequestException('No invitation found');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Supprimer l'invitation
    team.pendingInvitations = team.pendingInvitations.filter(
      (id) => id !== userId,
    );

    team.users.push(user);
    user.team = team;
    await this.userRepository.save(user);

    // Passer en ACTIVE si team >= 3 membres
    if (team.users.length >= 3) team.status = 'ACTIVE';

    return this.teamRepository.save(team);
  }

  async declineInvitation(teamId: number, userId: string): Promise<Team> {
    const team = await this.findOne(teamId);

    if (!team.pendingInvitations.includes(userId))
      throw new BadRequestException('No invitation found');

    team.pendingInvitations = team.pendingInvitations.filter(
      (id) => id !== userId,
    );
    return this.teamRepository.save(team);
  }

  async removeUser(teamId: number, userId: string): Promise<Team> {
    const team = await this.findOne(teamId);

    const user = team.users.find((u) => u.id === userId);
    if (!user) throw new BadRequestException('User not in team');

    team.users = team.users.filter((u) => u.id !== userId);

    // Passer en PENDING si moins de 3 membres
    if (team.users.length < 3) team.status = 'PENDING';

    return this.teamRepository.save(team);
  }

  async findMyTeams(userId: string): Promise<Team[]> {
    return this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.users', 'user')
      .where('user.id = :userId', { userId })
      .orWhere('team.leaderId = :userId', { userId })
      .getMany();
  }
}

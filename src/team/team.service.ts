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

  // CREATE TEAM
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

  // FIND ALL TEAMS
  async findAll(): Promise<Team[]> {
    return this.teamRepository.find({ relations: ['users'] });
  }

  // FIND ONE TEAM
  async findOne(id: number): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  // UPDATE TEAM
  async updateTeam(id: number, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.findOne(id);
    if (dto.name) team.name = dto.name;
    return this.teamRepository.save(team);
  }

  // DELETE TEAM
  async deleteTeam(id: number): Promise<void> {
    const team = await this.findOne(id);
    await this.teamRepository.remove(team);
  }

  // INVITE USER
  async inviteUser(teamId: number, userId: string): Promise<Team> {
    const team = await this.findOne(teamId);
    if (team.pendingInvitations.includes(userId))
      throw new BadRequestException('User already invited');

    team.pendingInvitations.push(userId);
    return this.teamRepository.save(team);
  }

  // ACCEPT INVITATION
  async acceptInvitation(teamId: number, userId: string): Promise<Team> {
    const team = await this.findOne(teamId);

    if (!team.pendingInvitations.includes(userId))
      throw new BadRequestException('No invitation found');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['teams'], // important for Many-to-Many
    });
    if (!user) throw new NotFoundException('User not found');

    // Remove invitation
    team.pendingInvitations = team.pendingInvitations.filter(
      (id) => id !== userId,
    );

    // Add user to team.users if not already present
    if (!team.users.find((u) => u.id === userId)) {
      team.users.push(user);
    }

    // Add team to user.teams if not already present
    if (!user.teams.find((t) => t.id === teamId)) {
      user.teams.push(team);
      await this.userRepository.save(user);
    }

    // Activate team if >= 3 members
    if (team.users.length >= 3) team.status = 'ACTIVE';

    return this.teamRepository.save(team);
  }

  // DECLINE INVITATION
  async declineInvitation(teamId: number, userId: string): Promise<Team> {
    const team = await this.findOne(teamId);

    if (!team.pendingInvitations.includes(userId))
      throw new BadRequestException('No invitation found');

    team.pendingInvitations = team.pendingInvitations.filter(
      (id) => id !== userId,
    );
    return this.teamRepository.save(team);
  }

  // REMOVE USER
  async removeUser(teamId: number, userId: string): Promise<Team> {
    const team = await this.findOne(teamId);

    const user = team.users.find((u) => u.id === userId);
    if (!user) throw new BadRequestException('User not in team');

    // Remove user from team
    team.users = team.users.filter((u) => u.id !== userId);

    // Also remove team from user's teams
    const userEntity = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['teams'],
    });
    if (userEntity) {
      userEntity.teams = userEntity.teams.filter((t) => t.id !== teamId);
      await this.userRepository.save(userEntity);
    }

    // Set PENDING if less than 3 members
    if (team.users.length < 3) team.status = 'PENDING';

    return this.teamRepository.save(team);
  }

  // FIND MY TEAMS
  async findMyTeams(userId: string): Promise<Team[]> {
    return this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.users', 'user')
      .where('user.id = :userId', { userId })
      .orWhere('team.leaderId = :userId', { userId })
      .getMany();
  }
}

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { PendingInvitation } from './entities/pending-invitation.entity';
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
    @InjectRepository(PendingInvitation)
    private readonly pendingInvitationRepository: Repository<PendingInvitation>,
  ) {}

  // CREATE TEAM
  async createTeam(dto: CreateTeamDto, leaderId: string): Promise<Team> {
    const leader = await this.userRepository.findOne({
      where: { id: leaderId },
      relations: ['team'],
    });
    if (!leader) throw new NotFoundException('Leader not found');
    if (leader.team)
      throw new BadRequestException('Leader already belongs to a team');

    const team = this.teamRepository.create({
      name: dto.name,
      leaderId: leader,
    });

    const savedTeam = await this.teamRepository.save(team);
    leader.team = savedTeam;
    await this.userRepository.save(leader);

    return this.findOne(savedTeam.id);
  }

  // FIND ALL TEAMS
  async findAll(): Promise<Team[]> {
    return this.teamRepository.find({
      relations: ['users', 'pendingInvitations', 'pendingInvitations.user'],
    });
  }

  // FIND ONE TEAM
  async findOne(id: number): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['users', 'pendingInvitations', 'pendingInvitations.user'],
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  // UPDATE TEAM
  async updateTeam(id: number, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.findOne(id);
    if (dto.name) team.name = dto.name;

    if (dto.leaderId) {
      const newLeader = team.users.find((user) => user.id === dto.leaderId);
      if (!newLeader)
        throw new BadRequestException('New leader must be a team member');
      team.leaderId = newLeader;
    }

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

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.team)
      throw new BadRequestException('User already belongs to a team');

    const existingInvitation = await this.pendingInvitationRepository.findOne({
      where: {
        team: { id: teamId },
        user: { id: userId },
      },
      relations: ['team', 'user'],
    });
    if (existingInvitation)
      throw new BadRequestException('User already invited');

    const invitation = this.pendingInvitationRepository.create({
      team,
      user,
    });
    await this.pendingInvitationRepository.save(invitation);

    return team;
  }

  // ACCEPT INVITATION
  async acceptInvitation(teamId: number, userId: string): Promise<Team> {
    const team = await this.findOne(teamId);

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['team'],
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.team && user.team.id !== teamId)
      throw new BadRequestException('User already belongs to another team');

    const invitation = await this.pendingInvitationRepository.findOne({
      where: {
        team: { id: teamId },
        user: { id: userId },
      },
      relations: ['team', 'user'],
    });
    if (!invitation) throw new BadRequestException('No invitation found');

    // Remove invitation
    await this.pendingInvitationRepository.remove(invitation);

    user.team = team;
    await this.userRepository.save(user);

    return this.findOne(teamId);
  }

  // DECLINE INVITATION
  async declineInvitation(teamId: number, userId: string): Promise<Team> {
    const team = await this.findOne(teamId);

    const invitation = await this.pendingInvitationRepository.findOne({
      where: {
        team: { id: teamId },
        user: { id: userId },
      },
      relations: ['team', 'user'],
    });
    if (!invitation) throw new BadRequestException('No invitation found');

    await this.pendingInvitationRepository.remove(invitation);
    return team;
  }

  // REMOVE USER
  async removeUser(teamId: number, userId: string): Promise<Team> {
    const team = await this.findOne(teamId);

    const currentLeaderId =
      typeof team.leaderId === 'object' ? team.leaderId?.id : team.leaderId;
    if (currentLeaderId === userId)
      throw new BadRequestException(
        'Leader must choose a new leader before quitting',
      );

    const userEntity = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['team'],
    });
    if (!userEntity || !userEntity.team || userEntity.team.id !== teamId)
      throw new BadRequestException('User not in team');

    userEntity.team = null;
    await this.userRepository.save(userEntity);

    return this.findOne(teamId);
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

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TeamService } from './team.service';
import { Team } from './entities/team.entity';
import { User } from '../user/entities/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TeamService', () => {
  let service: TeamService;
  const mockTeamRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        {
          provide: getRepositoryToken(Team),
          useValue: mockTeamRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a team for an existing leader', async () => {
    const leader = { id: 'leader-1' };
    const createdTeam = { id: 1, name: 'Alpha' };

    mockUserRepository.findOne.mockResolvedValue(leader);
    mockTeamRepository.create.mockReturnValue(createdTeam);
    mockTeamRepository.save.mockResolvedValue(createdTeam);

    const result = await service.createTeam({ name: 'Alpha' } as any, 'leader-1');

    expect(mockTeamRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alpha',
        leaderId: leader,
        users: [leader],
        pendingInvitations: [],
        status: 'PENDING',
      }),
    );
    expect(result).toEqual(createdTeam);
  });

  it('throws when the leader does not exist', async () => {
    mockUserRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createTeam({ name: 'Alpha' } as any, 'missing'),
    ).rejects.toThrow(NotFoundException);
  });

  it('finds all teams with the expected relations', async () => {
    mockTeamRepository.find.mockResolvedValue([{ id: 1 }]);

    await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
    expect(mockTeamRepository.find).toHaveBeenCalledWith({
      relations: ['users', 'challenges'],
    });
  });

  it('throws when a team is not found', async () => {
    mockTeamRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('updates the team name when present', async () => {
    const team = { id: 1, name: 'Old', users: [], challenges: [] };
    mockTeamRepository.findOne.mockResolvedValue(team);
    mockTeamRepository.save.mockResolvedValue({ ...team, name: 'New' });

    const result = await service.updateTeam(1, { name: 'New' } as any);

    expect(result.name).toBe('New');
  });

  it('removes an existing team', async () => {
    const team = { id: 1, users: [], challenges: [] };
    mockTeamRepository.findOne.mockResolvedValue(team);

    await service.deleteTeam(1);

    expect(mockTeamRepository.remove).toHaveBeenCalledWith(team);
  });

  it('rejects duplicate invitations', async () => {
    mockTeamRepository.findOne.mockResolvedValue({
      id: 1,
      users: [],
      challenges: [],
      pendingInvitations: ['user-1'],
    });

    await expect(service.inviteUser(1, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('accepts an invitation and activates the team at three members', async () => {
    const team = {
      id: 1,
      users: [{ id: 'leader-1' }, { id: 'member-1' }],
      challenges: [],
      pendingInvitations: ['user-2'],
      status: 'PENDING',
    };
    const user = {
      id: 'user-2',
      teams: [],
    };

    mockTeamRepository.findOne.mockResolvedValue(team);
    mockUserRepository.findOne.mockResolvedValue(user);
    mockUserRepository.save.mockResolvedValue(user);
    mockTeamRepository.save.mockResolvedValue({
      ...team,
      users: [...team.users, user],
      status: 'ACTIVE',
    });

    const result = await service.acceptInvitation(1, 'user-2');

    expect(user.teams).toHaveLength(1);
    expect(result.status).toBe('ACTIVE');
  });

  it('rejects accepting a missing invitation', async () => {
    mockTeamRepository.findOne.mockResolvedValue({
      id: 1,
      users: [],
      challenges: [],
      pendingInvitations: [],
    });

    await expect(service.acceptInvitation(1, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('declines an invitation and removes it from pending list', async () => {
    const team = {
      id: 1,
      users: [],
      challenges: [],
      pendingInvitations: ['user-1'],
    };
    mockTeamRepository.findOne.mockResolvedValue(team);
    mockTeamRepository.save.mockResolvedValue({
      ...team,
      pendingInvitations: [],
    });

    const result = await service.declineInvitation(1, 'user-1');

    expect(result.pendingInvitations).toEqual([]);
  });

  it('removes a user and downgrades the team status when needed', async () => {
    const team = {
      id: 1,
      users: [{ id: 'leader-1' }, { id: 'user-1' }, { id: 'user-2' }],
      challenges: [],
      pendingInvitations: [],
      status: 'ACTIVE',
    };
    const userEntity = {
      id: 'user-1',
      teams: [{ id: 1 }, { id: 2 }],
    };

    mockTeamRepository.findOne.mockResolvedValue(team);
    mockUserRepository.findOne.mockResolvedValue(userEntity);
    mockUserRepository.save.mockResolvedValue(userEntity);
    mockTeamRepository.save.mockResolvedValue({
      ...team,
      users: [{ id: 'leader-1' }, { id: 'user-2' }],
      status: 'PENDING',
    });

    const result = await service.removeUser(1, 'user-1');

    expect(result.status).toBe('PENDING');
    expect(mockUserRepository.save).toHaveBeenCalled();
  });

  it('returns teams for the current user through the query builder', async () => {
    const getMany = jest.fn().mockResolvedValue([{ id: 1 }]);
    const orWhere = jest.fn().mockReturnValue({ getMany });
    const where = jest.fn().mockReturnValue({ orWhere });
    const queryBuilder: any = {};
    queryBuilder.leftJoinAndSelect = jest
      .fn()
      .mockReturnValueOnce(queryBuilder)
      .mockReturnValueOnce({ where });

    mockTeamRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.findMyTeams('user-1')).resolves.toEqual([{ id: 1 }]);
    expect(mockTeamRepository.createQueryBuilder).toHaveBeenCalledWith('team');
  });
});

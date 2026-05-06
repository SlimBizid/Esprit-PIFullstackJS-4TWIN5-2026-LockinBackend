import { Test, TestingModule } from '@nestjs/testing';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

describe('TeamController', () => {
  let controller: TeamController;
  let service: TeamService;
  const mockTeamService = {
    createTeam: jest.fn(),
    findMyTeams: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateTeam: jest.fn(),
    deleteTeam: jest.fn(),
    removeUser: jest.fn(),
    inviteUser: jest.fn(),
    acceptInvitation: jest.fn(),
    declineInvitation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamController],
      providers: [
        {
          provide: TeamService,
          useValue: mockTeamService,
        },
      ],
    }).compile();

    controller = module.get<TeamController>(TeamController);
    service = module.get<TeamService>(TeamService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a team using the authenticated user id', async () => {
    mockTeamService.createTeam.mockResolvedValue({ id: 1, name: 'Alpha' });

    const result = await controller.create(
      { name: 'Alpha' } as any,
      { user: { id: 'leader-1' } } as any,
    );

    expect(result).toEqual({ id: 1, name: 'Alpha' });
    expect(service.createTeam).toHaveBeenCalledWith(
      { name: 'Alpha' },
      'leader-1',
    );
  });

  it('forwards the remaining controller actions to the service', async () => {
    mockTeamService.findAll.mockResolvedValue([{ id: 1 }]);
    mockTeamService.findOne.mockResolvedValue({ id: 2 });
    mockTeamService.updateTeam.mockResolvedValue({ id: 3, name: 'Beta' });
    mockTeamService.deleteTeam.mockResolvedValue(undefined);
    mockTeamService.findMyTeams.mockResolvedValue([{ id: 4 }]);
    mockTeamService.removeUser.mockResolvedValue({ id: 5 });
    mockTeamService.inviteUser.mockResolvedValue({ id: 6 });
    mockTeamService.acceptInvitation.mockResolvedValue({ id: 7 });
    mockTeamService.declineInvitation.mockResolvedValue({ id: 8 });

    await expect(controller.findAll()).resolves.toEqual([{ id: 1 }]);
    await expect(controller.findOne('2')).resolves.toEqual({ id: 2 });
    await expect(controller.update('3', { name: 'Beta' } as any)).resolves.toEqual({
      id: 3,
      name: 'Beta',
    });
    await expect(controller.remove('3')).resolves.toBeUndefined();
    await expect(
      controller.getMyTeams({ user: { id: 'user-1' } } as any),
    ).resolves.toEqual([{ id: 4 }]);
    await expect(controller.removeUser('5', 'user-2')).resolves.toEqual({ id: 5 });
    await expect(controller.inviteUser('6', 'user-3')).resolves.toEqual({ id: 6 });
    await expect(controller.acceptInvitation('7', 'user-4')).resolves.toEqual({ id: 7 });
    await expect(controller.declineInvitation('8', 'user-5')).resolves.toEqual({ id: 8 });
  });
});

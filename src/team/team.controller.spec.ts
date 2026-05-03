import { Test, TestingModule } from '@nestjs/testing';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

describe('TeamController', () => {
  let controller: TeamController;
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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

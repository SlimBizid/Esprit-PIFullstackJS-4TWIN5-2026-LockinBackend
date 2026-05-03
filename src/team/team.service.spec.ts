import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TeamService } from './team.service';
import { Team } from './entities/team.entity';
import { User } from '../user/entities/user.entity';

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
});

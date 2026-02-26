import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeController } from './challenge.controller';
import { ChallengeService } from './challenge.service';

describe('ChallengeController', () => {
  let controller: ChallengeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChallengeController],
      providers: [
        {
          provide: ChallengeService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByTitle: jest.fn(),
            findByType: jest.fn(),
            findByDifficulty: jest.fn(),
            createChallenge: jest.fn(),
            updateChallenge: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ChallengeController>(ChallengeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

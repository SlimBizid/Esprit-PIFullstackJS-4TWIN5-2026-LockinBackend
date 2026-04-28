import { ConfigService } from '@nestjs/config';
import { ChallengeService } from 'src/challenge/challenge.service';
import { CodeExecutionService } from './code-execution.service';

describe('CodeExecutionService', () => {
  let service: CodeExecutionService;

  beforeEach(() => {
    service = new CodeExecutionService(
      {} as ConfigService,
      {} as ChallengeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

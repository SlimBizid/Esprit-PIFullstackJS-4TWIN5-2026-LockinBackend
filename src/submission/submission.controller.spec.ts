import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';

describe('SubmissionController', () => {
  let controller: SubmissionController;

  beforeEach(() => {
    controller = new SubmissionController({} as SubmissionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

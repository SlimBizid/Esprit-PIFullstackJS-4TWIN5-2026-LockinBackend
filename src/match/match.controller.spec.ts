import { MatchController } from './match.controller';
import { MatchService } from './match.service';

describe('MatchController', () => {
  let controller: MatchController;

  beforeEach(() => {
    controller = new MatchController({} as MatchService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

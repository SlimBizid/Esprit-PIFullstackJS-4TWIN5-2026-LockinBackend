import { ImposterController } from './imposter.controller';
import { ImposterService } from './imposter.service';

describe('ImposterController', () => {
  let controller: ImposterController;

  beforeEach(() => {
    controller = new ImposterController({} as ImposterService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

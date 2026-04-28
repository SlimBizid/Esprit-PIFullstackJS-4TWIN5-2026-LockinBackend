import { CodeExecutionController } from './code-execution.controller';
import { CodeExecutionService } from './code-execution.service';

describe('CodeExecutionController', () => {
  let controller: CodeExecutionController;

  beforeEach(() => {
    controller = new CodeExecutionController({} as CodeExecutionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

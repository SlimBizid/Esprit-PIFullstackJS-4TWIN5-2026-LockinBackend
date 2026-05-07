import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SearchIndexBootstrapService } from './search-index-bootstrap.service';

describe('SearchIndexBootstrapService', () => {
  let service: SearchIndexBootstrapService;
  let dataSource: Pick<DataSource, 'query'>;

  beforeEach(() => {
    dataSource = {
      query: jest.fn().mockResolvedValue(undefined),
    };
    service = new SearchIndexBootstrapService(dataSource as DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize the trigram extension and indexes', async () => {
    await service.onApplicationBootstrap();

    expect(dataSource.query).toHaveBeenCalledTimes(3);
  });

  it('should log a warning if initialization fails', async () => {
    const loggerWarnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    (dataSource.query as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    await service.onApplicationBootstrap();

    expect(loggerWarnSpy).toHaveBeenCalled();
    loggerWarnSpy.mockRestore();
  });
});

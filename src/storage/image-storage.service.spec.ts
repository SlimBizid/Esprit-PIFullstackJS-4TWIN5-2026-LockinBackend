import { AzureStorageService } from '@nestjs/azure-storage';
import { ImageStorageService } from './image-storage.service';

describe('ImageStorageService', () => {
  let service: ImageStorageService;

  beforeEach(() => {
    service = new ImageStorageService({} as AzureStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

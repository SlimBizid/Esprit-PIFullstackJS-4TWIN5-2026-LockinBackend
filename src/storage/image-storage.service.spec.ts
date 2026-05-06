import { AzureStorageService } from '@nestjs/azure-storage';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ImageStorageService } from './image-storage.service';

describe('ImageStorageService', () => {
  let service: ImageStorageService;
  const azureStorageService = {
    upload: jest.fn(),
  };
  const originalEnv = {
    account: process.env.AZURE_STORAGE_ACCOUNT,
    sas: process.env.AZURE_STORAGE_SAS_KEY,
    container: process.env.AZURE_STORAGE_CONTAINER_NAME,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AZURE_STORAGE_ACCOUNT = 'account';
    process.env.AZURE_STORAGE_SAS_KEY = 'sas';
    process.env.AZURE_STORAGE_CONTAINER_NAME = 'container';
    service = new ImageStorageService(azureStorageService as unknown as AzureStorageService);
  });

  afterAll(() => {
    process.env.AZURE_STORAGE_ACCOUNT = originalEnv.account;
    process.env.AZURE_STORAGE_SAS_KEY = originalEnv.sas;
    process.env.AZURE_STORAGE_CONTAINER_NAME = originalEnv.container;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uploads a valid image and keeps the folder prefix', async () => {
    azureStorageService.upload.mockResolvedValue('https://storage/image.png');

    const result = await service.uploadImage({
      buffer: Buffer.from('img'),
      fieldname: 'file',
      mimetype: 'image/png',
      originalname: 'avatar.png',
      size: 3,
    } as never, 'avatars');

    expect(result).toBe('https://storage/image.png');
    expect(azureStorageService.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: expect.stringMatching(/^avatars\/.+\.png$/),
      }),
    );
  });

  it('derives an extension from the mime type when the original name has none', async () => {
    azureStorageService.upload.mockResolvedValue('https://storage/image.jpg');

    await service.uploadImage({
      buffer: Buffer.from('img'),
      fieldname: 'file',
      mimetype: 'image/jpeg',
      originalname: 'avatar',
      size: 3,
    } as never);

    expect(azureStorageService.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: expect.stringMatching(/^uploads\/.+\.jpg$/),
      }),
    );
  });

  it('rejects non-image uploads', async () => {
    await expect(
      service.uploadImage({
        buffer: Buffer.from('txt'),
        fieldname: 'file',
        mimetype: 'text/plain',
        originalname: 'note.txt',
        size: 3,
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when upload returns an empty url', async () => {
    azureStorageService.upload.mockResolvedValue('');

    await expect(
      service.uploadImage({
        buffer: Buffer.from('img'),
        fieldname: 'file',
        mimetype: 'image/png',
        originalname: 'avatar.png',
        size: 3,
      } as never),
    ).rejects.toThrow(InternalServerErrorException);
  });
});

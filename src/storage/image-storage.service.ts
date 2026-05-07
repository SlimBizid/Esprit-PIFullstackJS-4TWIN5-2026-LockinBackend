import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  AzureStorageService,
  UploadedFileMetadata,
} from '@nestjs/azure-storage';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class ImageStorageService {
  constructor(private readonly azureStorageService: AzureStorageService) {}

  private readonly accountName = process.env.AZURE_STORAGE_ACCOUNT;
  private readonly sasKey = process.env.AZURE_STORAGE_SAS_KEY;
  private readonly containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

  async uploadImage(
    file: UploadedFileMetadata,
    folder: string = 'uploads',
  ): Promise<string> {
    if (!this.accountName) {
      throw new InternalServerErrorException(
        'AZURE_STORAGE_ACCOUNT is not configured',
      );
    }

    if (!this.sasKey) {
      throw new InternalServerErrorException(
        'AZURE_STORAGE_SAS_KEY is not configured',
      );
    }

    if (!this.containerName) {
      throw new InternalServerErrorException(
        'AZURE_STORAGE_CONTAINER_NAME is not configured',
      );
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const extension =
      extname(file.originalname ?? '') ||
      this.getExtensionFromMimeType(file.mimetype);
    const uploadFile: UploadedFileMetadata = {
      ...file,
      originalname: `${folder}/${randomUUID()}${extension}`,
    };

    const storageUrl = await this.azureStorageService.upload(uploadFile);

    if (!storageUrl) {
      throw new InternalServerErrorException('Failed to upload image');
    }

    return storageUrl;
  }

  private getExtensionFromMimeType(mimeType?: string): string {
    const mimeToExtensionMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
    };

    return mimeToExtensionMap[mimeType ?? ''] ?? '';
  }
}

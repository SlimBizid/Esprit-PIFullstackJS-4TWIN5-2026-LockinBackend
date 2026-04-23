import { AzureStorageModule } from '@nestjs/azure-storage';
import { Global, Module } from '@nestjs/common';
import { ImageStorageService } from './image-storage.service';

process.loadEnvFile?.();

@Global()
@Module({
  imports: [
    AzureStorageModule.withConfig({
      accountName: process.env.AZURE_STORAGE_ACCOUNT ?? '',
      sasKey: process.env.AZURE_STORAGE_SAS_KEY ?? '',
      containerName: process.env.AZURE_STORAGE_CONTAINER_NAME ?? '',
    }),
  ],
  providers: [ImageStorageService],
  exports: [ImageStorageService],
})
export class StorageModule {}

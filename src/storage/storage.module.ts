import { AzureStorageModule } from '@nestjs/azure-storage';
import { Global, Module } from '@nestjs/common';
import { ImageStorageService } from './image-storage.service';

// i hate doing this but it might not go through prod build so i have to nuke it
// eslint-disable-next-line @typescript-eslint/require-await
const storageConfigFactory = async () => ({
  sasKey: process.env['AZURE_STORAGE_SAS_KEY'] ?? '',
  accountName: process.env['AZURE_STORAGE_ACCOUNT'] ?? '',
  containerName: process.env['AZURE_STORAGE_CONTAINER_NAME'] ?? '',
});

@Global()
@Module({
  imports: [
    AzureStorageModule.withConfigAsync({
      useFactory: storageConfigFactory,
    }),
  ],
  providers: [ImageStorageService],
  exports: [ImageStorageService],
})
export class StorageModule {}

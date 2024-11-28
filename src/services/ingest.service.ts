import { Injectable, Logger } from '@nestjs/common';
import { VideoService } from './video.service';
import { MinioConnector } from '../connectors/minio.connector';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly videoService: VideoService,
    private readonly minioConnector: MinioConnector,
  ) { }

  /**
   * Initializes the ingestion process for a given task.
   * @param task Task details including project ID and name.
   * @param sourcePath Path to the source video file.
   */
  async videoToDatalake(dstPath: string, projectName: string, sourcePath: string): Promise<void> {
    const tmpDir = path.join(__dirname, 'tmp');
    const tmpImages = path.join(tmpDir, dstPath);
    const tmpPreviewImages = path.join(tmpDir, dstPath + '-preview');
    const storagePath = `${projectName}/${dstPath}/images/default`;
    const previewStoragePath = `${projectName}/${dstPath}/preview/default`;

    try {
      this.logger.log(`Starting ingestion for task ${dstPath}`);

      // Fragment video and store frames in temporary directory
      await this.videoService.videoFragmentation(sourcePath, tmpImages, "lossless");

      // Upload fragmented images to MinIO
      await this.ingestImages(tmpImages, storagePath, 'l4-dl');

      // Cleanup temporary directory
      await this.videoService.cleanupDirectory(tmpImages);

      // Fragment video and store frames in temporary directory
      await this.videoService.videoFragmentation(sourcePath, tmpPreviewImages, "preview");

      // Upload fragmented images to MinIO
      await this.ingestImages(tmpPreviewImages, previewStoragePath, 'l4-dl');

      // Cleanup temporary directory
      await this.videoService.cleanupDirectory(tmpPreviewImages);

      this.logger.log(`Completed ingestion for task ${dstPath}`);
    } catch (error) {
      this.logger.error(`Error during ingestion for task ${dstPath}`, error);
    }
  }

  /**
   * Ingests images by uploading them recursively to a MinIO bucket.
   * @param sourceDirectory Path to the source directory containing images.
   * @param targetPath Path within the MinIO bucket.
   * @param bucketName MinIO bucket name.
   */
  private async ingestImages(sourceDirectory: string, targetPath: string, bucketName: string): Promise<void> {
    const uploadFilesRecursively = async (dir: string, targetDir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const fullPath = path.join(dir, file);
        const targetFilePath = path.join(targetDir, file);

        if (fs.lstatSync(fullPath).isDirectory()) {
          // Recurse into subdirectories
          await uploadFilesRecursively(fullPath, targetFilePath);
        } else {
          // Upload file to MinIO
          await this.minioConnector.putObject(bucketName, targetFilePath, fullPath);
        }
      }
    };

    try {
      this.logger.log('Starting image ingestion...');
      await uploadFilesRecursively(sourceDirectory, targetPath);
      this.logger.log('Image ingestion completed.');
    } catch (error) {
      this.logger.error('Error during image ingestion:', error);
    }
  }
}
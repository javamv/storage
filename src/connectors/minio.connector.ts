import { Injectable, Inject, Logger } from '@nestjs/common';
import { Client as MinioClient } from 'minio';

@Injectable()
export class MinioConnector {

    private readonly logger = new Logger(MinioConnector.name);

    constructor(
        @Inject('MINIO_CLIENT') private readonly minioClient: MinioClient,
    ) { }

    async downloadFileFromMinio(bucketName: string, objectName: string, filePath: string): Promise<string> {
        try {
          await this.minioClient.fGetObject(bucketName, objectName, filePath);
          this.logger.log(`Successfully downloaded ${objectName} from MinIO bucket ${bucketName} to ${filePath}`);
          return filePath;
        } catch (err) {
          this.logger.error(`Error downloading ${objectName} from MinIO bucket ${bucketName}:`, err);
          throw err;
        }
      }

    async checkAndCreateBuckets(): Promise<void> {
        const buckets = ['l1-raw', 'l2-prep', 'l3-rel', 'l4-dl'];

        for (const bucket of buckets) {
            try {
                const bucketExists = await this.minioClient.bucketExists(bucket);
                if (!bucketExists) {
                    await this.minioClient.makeBucket(bucket, 'local-1');
                    this.logger.log(`Bucket ${bucket} created`);
                } else {
                    this.logger.log(`Bucket ${bucket} already exists`);
                }
            } catch (error) {
                this.logger.error(`Error checking/creating bucket ${bucket}:`, error);
            }
        }
    }

    async putObject(bucketName: string, targetFilePath: string, fullPath: string,  metadata: Record<string, any> = {}): Promise<string> {
        try {
            const info = await this.minioClient.fPutObject(bucketName, targetFilePath, fullPath, metadata);
            this.logger.log(`Uploaded ${fullPath} to ${bucketName}/${targetFilePath} with ETag: ${info.etag}`);
            return info.etag;
          } catch (err) {
            this.logger.error(`Error uploading ${fullPath} to ${bucketName}/${targetFilePath}:`, err);
            throw err;
          }
    }

    async testMinioConnection(): Promise<void> {
        try {
            const buckets = await this.minioClient.listBuckets();
            this.logger.log(`MinIO connection successful. Buckets: ${buckets.map((b) => b.name).join(', ')}`);
        } catch (error) {
            this.logger.error('Error connecting to MinIO:', error);
        }
    }
}
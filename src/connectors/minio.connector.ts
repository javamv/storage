import { Injectable, Inject, Logger } from '@nestjs/common';
import { Client as MinioClient } from 'minio';

@Injectable()
export class MinioConnector {

    private readonly logger = new Logger(MinioConnector.name);

    constructor(
        @Inject('MINIO_CLIENT') private readonly minioClient: MinioClient,
    ) { }

    async downloadFile(bucketName: string, objectName: string, filePath: string): Promise<string> {
        try {
            await this.minioClient.fGetObject(bucketName, objectName, filePath);
            this.logger.log(`Successfully downloaded ${objectName} from MinIO bucket ${bucketName} to ${filePath}`);
            return filePath;
        } catch (err) {
            this.logger.error(`Error downloading ${objectName} from MinIO bucket ${bucketName}:`, err);
            throw err;
        }
    }

    async uploadFile(bucketName: string, objectName: string, filePath: string, metadata: Record<string, any> = {}): Promise<string> {
        try {
            // Upload the file from the local filesystem to the specified MinIO bucket
            const result = await this.minioClient.fPutObject(bucketName, objectName, filePath, metadata);
            
            this.logger.log(`Successfully uploaded ${filePath} to ${bucketName}/${objectName} with ETag: ${result.etag}`);
            return result.etag;  // Return the ETag of the uploaded file
        } catch (err) {
            this.logger.error(`Error uploading ${filePath} to MinIO bucket ${bucketName}:`, err);
            throw err;  // Re-throw the error to be handled by the caller
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

    // New function to get object stats (size, last modified, etc.)
    async getObjectStats(bucketName: string, objectName: string): Promise<any> {
        try {
            const stats = await this.minioClient.statObject(bucketName, objectName);
            this.logger.log(`Successfully fetched stats for ${objectName} from bucket ${bucketName}`);
            return stats;  // Returns stats including size, last modified, and more
        } catch (err) {
            this.logger.error(`Error fetching stats for ${objectName} from MinIO bucket ${bucketName}:`, err);
            throw err;
        }
    }

    // Fetch full object as a data stream
    async getObject(bucketName: string, objectName: string): Promise<NodeJS.ReadableStream> {
        try {
            const dataStream = await this.minioClient.getObject(bucketName, objectName);
            this.logger.log(`Successfully fetched the full object ${objectName} from bucket ${bucketName}`);
            return dataStream;
        } catch (err) {
            this.logger.error(`Error fetching the full object ${objectName} from MinIO bucket ${bucketName}:`, err);
            throw err;
        }
    }

    async getPartialObject(bucketName: string, objectName: string, offset: number, length: number, getOpts: object = {}): Promise<NodeJS.ReadableStream> {
        try {
            // Use MinIO's getPartialObject API to fetch a part of the object starting from 'offset' and with a given 'length'
            const dataStream = await this.minioClient.getPartialObject(bucketName, objectName, offset, length, getOpts);
            
            this.logger.log(`Successfully fetched partial object ${objectName} from bucket ${bucketName}, offset: ${offset}, length: ${length}`);
            return dataStream;
        } catch (err) {
            this.logger.error(`Error fetching partial object ${objectName} from MinIO bucket ${bucketName}:`, err);
            throw err;
        }
    }
    
    // New method to list all objects in a specified bucket
    async listAllObjects(bucketName: string): Promise<any[]> {
        try {
            const objects = [];
            const stream = this.minioClient.listObjectsV2(bucketName, '', true);

            return new Promise((resolve, reject) => {
                stream.on('data', (obj) => {
                    objects.push(obj); // Collect each object from the stream
                });
                stream.on('end', () => {
                    this.logger.log(`Successfully fetched all objects from bucket ${bucketName}`);
                    resolve(objects); // Return all collected objects once the stream ends
                });
                stream.on('error', (err) => {
                    this.logger.error(`Error listing objects from bucket ${bucketName}:`, err);
                    reject(err); // Reject the promise in case of an error
                });
            });
        } catch (err) {
            this.logger.error(`Error listing objects in bucket ${bucketName}:`, err);
            throw err; // Throw the error if anything goes wrong
        }
    }

    async putObject(bucketName: string, targetFilePath: string, fullPath: string, metadata: Record<string, any> = {}): Promise<string> {
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
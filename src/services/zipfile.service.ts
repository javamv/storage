import { Injectable, Logger } from '@nestjs/common';
import { MinioConnector } from '../connectors/minio.connector';
import * as unzipper from 'unzipper';
import * as path from 'path';
import * as fs from 'fs';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ZipFileProcessorService {

    private readonly logger = new Logger(ZipFileProcessorService.name);

    constructor(
        private readonly minio: MinioConnector,
    ) { }

    private async unzipFile(fileStream: NodeJS.ReadableStream, targetDir: string): Promise<void> {
        // Unzip the file stream and store it in a temporary directory
        await fileStream.pipe(unzipper.Extract({ path: targetDir })).promise();
        this.logger.log(`Unzipped content to ${targetDir}`);
    }

    private async uploadUnzippedContentToL4(localPath: string, dstPath: string): Promise<void> {
        // Upload each unzipped file to the l4-dl bucket
        const files = await this.getFilesInDirectory(localPath); // Helper to list files
        for (const file of files) {
            const targetPath = path.join(dstPath, file.relativePath);
            const filePath = path.join(localPath, file.relativePath);
            await this.minio.uploadFile('l4-dl', targetPath, filePath);
            this.logger.log(`Uploaded ${filePath} to l4-dl/${targetPath}`);
        }
    }

    private async getFilesInDirectory(dir: string): Promise<{ relativePath: string }[]> {
        const files: { relativePath: string }[] = [];

        // Helper function to read files recursively
        const readDirectory = (directory: string, basePath: string) => {
            const items = fs.readdirSync(directory); // Synchronously read contents of the directory

            items.forEach((item) => {
                const itemPath = path.join(directory, item); // Get full path of the item
                const relativePath = path.relative(basePath, itemPath); // Get the relative path

                if (fs.statSync(itemPath).isDirectory()) {
                    // If item is a directory, recurse into it
                    readDirectory(itemPath, basePath);
                } else {
                    // If item is a file, add its relative path
                    files.push({ relativePath });
                }
            });
        };

        // Start the recursion from the given directory
        if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
            readDirectory(dir, dir);
        } else {
            throw new Error(`The provided path is not a valid directory: ${dir}`);
        }

        return files;
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async checkNewZipFiles(): Promise<void> {
        // Ensure the lock is acquired before processing
        const lockAcquired = await this.minio.acquireLock();
        if (!lockAcquired) return;

        try {
            const objects = await this.minio.listAllObjects('l2-prep', 'annotations/');
            for (const obj of objects) {
                if (obj.name.endsWith('.zip')) {
                    this.logger.log(`New zip file detected: ${obj.name}`);
                    // Download the zip file
                    const fileStream = await this.minio.getObject('l2-prep', obj.name);

                    // Decode filename into the target path (e.g., test---file.zip -> test/file)
                    const fileName = path.basename(obj.name, '.zip');
                    const decodedPath = fileName.replace(/---/g, '/');
                    const tempDir = '/tmp/unzipped-content'; // Temp directory to unzip content

                    // Unzip the content to the temp directory
                    await this.unzipFile(fileStream, tempDir);

                    // Upload the unzipped content to the l4-dl bucket
                    await this.uploadUnzippedContentToL4(tempDir, `${decodedPath}`);

                    // Remove the processed object from l2-prep bucket
                    await this.minio.removeObject('l2-prep', obj.name);
                    this.logger.log(`Processed and removed ${obj.name} from l2-prep`);
                }
            }
        } catch (err) {
            this.logger.error('Error checking or processing zip files:', err);
        } finally {
            // Release the lock
            await this.minio.releaseLock();
        }
    }
}
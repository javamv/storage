import { Controller, Get, Post, Body, Query, Req, Res, UseGuards, UploadedFiles, HttpStatus, UseInterceptors } from '@nestjs/common';
import { MinioConnector } from './connectors/minio.connector';  // Assume you create a service to interact with MinIO
import { VideoService } from './services/video.service';  // Assume this handles video metadata extraction
import { MongoService } from './services/mongo.service';  // Mongo service to interact with your database
import { AuthGuard } from './auth/auth.guard.rpc';  // Auth guard for route protection
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('api')
export class StorageController {
    constructor(
        private readonly storage: MinioConnector,
        private readonly video: VideoService,
        private readonly db: MongoService,
    ) { }

    @Get('sync-minio-structure')
    @UseGuards(AuthGuard)  // Use the custom auth guard here
    async syncMinioStructure(@Req() req, @Res() res) {
        try {
            console.log('Start syncing MinIO buckets');
            const buckets = ["l1-raw", "l2-prep", "l3-rel"];
            const newBucketData = await Promise.all(buckets.map(async (bucket) => {
                const objects = await this.storage.listAllObjects(bucket);
                return { bucket, objects };
            }));

            await this.db.updateBucketData(newBucketData);

            const allObjects = await this.db.getAllActiveObjects();
            return res.json(this.groupByBucket(allObjects));
        } catch (err) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
        }
    }

    @Get('fetch-minio-structure')
    @UseGuards(AuthGuard)
    async fetchMinioStructure(@Req() req, @Res() res) {
        try {
            const activeData = await this.db.getAllActiveObjects();
            return res.json(this.groupByBucket(activeData));
        } catch (err) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
        }
    }

    @Get('stream/l1')
    async streamVideo(@Query('fileName') fileName: string, @Res() res) {
        try {
            const fileStats = await this.storage.getObjectStats('l1-raw', fileName);
            const fileSize = fileStats.size;
            const range = res.getHeader('Range');

            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

                if (start >= fileSize) {
                    return res.status(416).send('Requested range not satisfiable');
                }

                const chunkSize = (end - start) + 1;
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type': 'video/mp4',
                });

                const dataStream = await this.storage.getPartialObject('l1-raw', fileName, start, chunkSize);
                dataStream.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': 'video/mp4',
                });

                const dataStream = await this.storage.getObject('l1-raw', fileName);
                dataStream.pipe(res);
            }
        } catch (err) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err.message);
        }
    }

    @Post('sync-metadata')
    @UseGuards(AuthGuard)
    async syncMetadata(@Body() body: { bucketName: string, objectName: string }, @Res() res) {
        const { bucketName, objectName } = body;
        const tempDir = path.join(__dirname, 'temp');
        const tempFilePath = path.join(tempDir, objectName);

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        try {
            const filePath = await this.storage.downloadFile(bucketName, objectName, tempFilePath);
            const metadata = await this.video.extractMetadata(filePath);
            const updatedObjects = await this.db.storeMetadata(objectName, metadata);

            fs.unlinkSync(filePath);
            return res.json(updatedObjects);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @UseGuards(AuthGuard)
    async uploadFile(@UploadedFiles() files: Express.Multer.File[], @Body() body: { customer: string, date: string }, @Res() res) {
        const { customer, date } = body;

        try {
            const startTime = Date.now();

            for (const file of files) {
                const objectName = `${customer}_${format(new Date(date), 'yyMMdd')}/${file.originalname}`;
                await this.storage.uploadFile('l1-raw', objectName, file.path);
                fs.unlinkSync(file.path);
            }

            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            return res.status(HttpStatus.OK).json({ message: `Files uploaded successfully in ${duration} seconds` });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error uploading files' });
        }
    }

    private groupByBucket(data) {
        return data.reduce((acc, obj) => {
            const { bucket, ...rest } = obj;
            if (!acc[bucket]) {
                acc[bucket] = [];
            }
            acc[bucket].push(rest);
            return acc;
        }, {});
    }
}
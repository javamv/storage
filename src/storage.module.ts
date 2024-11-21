import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SObject, SObjectSchema } from './schemas/sobject.schema';
import { ClientsModule } from '@nestjs/microservices';
import { MinioConnector } from './connectors/minio.connector';
import { VideoService } from './services/video.service';
import { StorageController } from './storage.controller';
import { StorageService } from './services/storage.service';
import { grpcOptionsFactory, kafkaOptionsFactory, mongooseOptionsFactory, minioClientFactory } from './storage.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`, 
    }),
    // Mongoose configuration using async factory
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: mongooseOptionsFactory,
    }),
    // Mongoose schema registration
    MongooseModule.forFeature([
      { name: SObject.name, schema: SObjectSchema },
    ]),
    // Registering gRPC service
    ClientsModule.registerAsync([
      {
        name: 'AUTH_PACKAGE',
        useFactory: grpcOptionsFactory,
        inject: [ConfigService],
      },
    ]),
    // Registering Kafka service
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        useFactory: kafkaOptionsFactory,
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [StorageController],
  providers: [
    MinioConnector,
    StorageService,
    VideoService,
    {
      provide: 'MINIO_CLIENT',
      useFactory: minioClientFactory,
      inject: [ConfigService],
    },
  ],
  exports: ['MINIO_CLIENT', MinioConnector, VideoService], // Export the client for use in other services
})
export class StorageModule {}
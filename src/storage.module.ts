import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from './schemas/job.schema';
import { ClientsModule } from '@nestjs/microservices';
import { MinioConnector } from './connectors/minio.connector'
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
      { name: Job.name, schema: JobSchema },
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
  controllers: [],
  providers: [
    MinioConnector,
    {
      provide: 'MINIO_CLIENT',
      useFactory: minioClientFactory,
      inject: [ConfigService],
    },
  ],
  exports: ['MINIO_CLIENT', MinioConnector], // Export the client for use in other services
})
export class StorageModule {}
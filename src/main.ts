import { NestFactory } from '@nestjs/core';
import { EggsModule } from './storage.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions } from '@nestjs/microservices';
import { grpcOptionsFactory, kafkaOptionsFactory, mongooseOptionsFactory } from './storage.config'; // Import both factories

async function bootstrap() {
  const app = await NestFactory.create(EggsModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: '*', // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // If your API requires credentials
    allowedHeaders: 'Authorization, Content-Type', // Allow specific headers
  });

  const port = configService.get<number>('PORT') || 3003;  // Optionally use a PORT from the .env

  // Create and start the gRPC microservice using the factory
  const grpcOptions = await grpcOptionsFactory(configService);
  const grpcServer = app.connectMicroservice<MicroserviceOptions>(grpcOptions);

  // Create and start the Kafka microservice using the factory
  const kafkaOptions = await kafkaOptionsFactory(configService);
  const kafkaServer = app.connectMicroservice<MicroserviceOptions>(kafkaOptions);

  const mongoOptions = await mongooseOptionsFactory(configService);

  // Start both microservices (gRPC and Kafka)
  await app.startAllMicroservices();

  // Start the HTTP server
  await app.listen(port);
  console.log(`Eggs service is set to run on http://localhost:${port}`);
  console.log(`gRPC server is running on ${grpcOptions.options.url}`);
  console.log(`Kafka service is connected with brokers: ${kafkaOptions.options.client.brokers}`);
  console.log(`Mongoose is connected with mongodb: ${mongoOptions.uri}`);
}

bootstrap();
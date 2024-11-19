import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { StorageModule } from '../src/storage.module'; // Replace with the actual module containing your controller
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: './.env.dev' });  // Load the dev.env for this test

describe('MinIOController (Integration)', () => {
  let app: INestApplication;

  const mockStorageService = {
    // Mock for listAllObjects, which handles multiple buckets
    listAllObjects: jest.fn().mockImplementation((bucket) => {
      // Generate unique objects based on the bucket name
      const objectData = {
        'l1-raw': [
          {
            id: '1',
            bucket: 'l1-raw',
            name: 'l1-raw-file1.txt',
            active: true,
            metadata: {},
          },
          {
            id: '2',
            bucket: 'l1-raw',
            name: 'l1-raw-file2.txt',
            active: true,
            metadata: {},
          },
        ],
        'l2-prep': [
          {
            id: '3',
            bucket: 'l2-prep',
            name: 'l2-prep-file1.txt',
            active: true,
            metadata: {},
          },
          {
            id: '4',
            bucket: 'l2-prep',
            name: 'l2-prep-file2.txt',
            active: true,
            metadata: {},
          },
        ],
        'l3-rel': [
          {
            id: '5',
            bucket: 'l3-rel',
            name: 'l3-rel-file1.txt',
            active: true,
            metadata: {},
          },
          {
            id: '6',
            bucket: 'l3-rel',
            name: 'l3-rel-file2.txt',
            active: true,
            metadata: {},
          },
        ],
      };
      return Promise.resolve(objectData[bucket] || []); // Return the objects based on the bucket name
    }),
  };

  const mockDbService = {
    // Mocking the method that updates bucket data
    updateBucketData: jest.fn().mockResolvedValue(true),

    // Mocking the method that retrieves all active objects
    getAllActiveObjects: jest.fn().mockResolvedValue([
      // Reflecting the SObject schema
      {
        _id: 12234,  // MongoDB's unique document ID (not the same as 'id')
        id: '1',      // 'id' is a string, required and unique
        bucket: 'l1-raw', // 'bucket' is a string, required
        name: 'l1-raw-file1.txt', // 'name' is a string, required
        active: true, // 'active' is a boolean, defaults to true
        metadata: {}, // 'metadata' is optional, can be an object
      },
      {
        _id: 12366,
        id: '2',
        bucket: 'l2-prep',
        name: 'l2-prep-file1.txt',
        active: true,
        metadata: {},
      },
    ]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [StorageModule],
    })
      .overrideProvider('StorageService') // Replace with your actual service token
      .useValue(mockStorageService)
      .overrideProvider('DbService') // Replace with your actual service token
      .useValue(mockDbService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/sync-minio-structure (GET) - Success', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/sync-minio-structure') // Replace with your actual route
      .set('Authorization', 'Bearer valid_token'); // Replace with your auth header

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({
      'l1-raw': [{ key: 'l1-raw-file1.txt' }],
      'l2-prep': [{ key: 'l2-prep-file1.txt' }],
    });

    expect(mockStorageService.listAllObjects).toHaveBeenCalledTimes(3);
    expect(mockDbService.updateBucketData).toHaveBeenCalledTimes(1);
    expect(mockDbService.getAllActiveObjects).toHaveBeenCalledTimes(1);
  });

  it('/sync-minio-structure (GET) - Error', async () => {
    mockStorageService.listAllObjects.mockRejectedValueOnce(
      new Error('MinIO Service Error')
    );

    const response = await request(app.getHttpServer())
      .get('/sync-minio-structure')
      .set('Authorization', 'Bearer valid_token'); // Replace with your auth header

    expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.body).toEqual({ error: 'MinIO Service Error' });

    expect(mockStorageService.listAllObjects).toHaveBeenCalledTimes(1);
  });
});
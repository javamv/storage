import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SObject } from '../schemas/sobject.schema'; // Assuming you have an ObjectData schema

@Injectable()
export class MongoService {

  private readonly logger = new Logger(MongoService.name);

  constructor(
    @InjectModel(SObject.name) private readonly objectModel: Model<SObject>,  // Adjust schema name accordingly
  ) {}

  // Function to update bucket data
  async updateBucketData(bucketData: Array<any>): Promise<void> {
    try {
      // Assuming bucketData is an array of objects containing bucket and object details
      for (const bucket of bucketData) {
        // Perform your MongoDB operations here
        // E.g., Insert or Update logic based on your schema
        await this.objectModel.updateMany(
          { bucket: bucket.bucket }, 
          { $set: { objects: bucket.objects } }, 
          { upsert: true }
        );
      }
    } catch (err) {
      this.logger.error('Error updating bucket data', err);
      throw err;
    }
  }

  // Function to retrieve all active objects from MongoDB
  async getAllActiveObjects(): Promise<any[]> {
    try {
      const activeObjects = await this.objectModel.find({ status: 'active' }).exec(); // Example query
      return activeObjects;
    } catch (err) {
      this.logger.error('Error fetching active objects', err);
      throw err;
    }
  }

  // Store metadata in MongoDB (example)
  async storeMetadata(objectName: string, metadata: any): Promise<any> {
    try {
      // Assuming you are storing metadata for objects
      const result = await this.objectModel.findOneAndUpdate(
        { objectName }, 
        { $set: { metadata } },
        { new: true, upsert: true }
      );
      return result;
    } catch (err) {
      this.logger.error('Error storing metadata', err);
      throw err;
    }
  }
}
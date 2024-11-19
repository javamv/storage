import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_date', updatedAt: 'updated_date' } })
export class Job extends Document {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  id: number;

  @Prop({ required: true })
  task_id: number;

  @Prop({ required: true })
  project_id: number;

  @Prop({
    type: {
      url: { type: String, required: true },
      id: { type: Number, required: true },
      username: { type: String, required: true },
      first_name: { type: String, required: true },
      last_name: { type: String, required: true },
    },
    required: true,
  })
  assignee: {
    url: string;
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };

  @Prop({ required: true })
  guide_id: number;

  @Prop({ required: true })
  dimension: string;

  @Prop()
  bug_tracker: string;

  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  stage: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  mode: string;

  @Prop({ required: true })
  frame_count: number;

  @Prop({ required: true })
  start_frame: number;

  @Prop({ required: true })
  stop_frame: number;

  @Prop({ required: true })
  data_chunk_size: number;

  @Prop({ required: true })
  data_compressed_chunk_type: string;

  @Prop({
    type: {
      url: { type: String, required: true },
      count: { type: Number, required: true },
    },
    required: true,
  })
  issues: {
    url: string;
    count: number;
  };

  @Prop({
    type: {
      url: { type: String, required: true },
    },
    required: true,
  })
  labels: {
    url: string;
  };

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  organization: number;

  @Prop({
    type: {
      id: { type: Number, required: true },
      location: { type: String, required: true },
      cloud_storage_id: { type: Number, required: true },
    },
    required: true,
  })
  target_storage: {
    id: number;
    location: string;
    cloud_storage_id: number;
  };

  @Prop({
    type: {
      id: { type: Number, required: true },
      location: { type: String, required: true },
      cloud_storage_id: { type: Number, required: true },
    },
    required: true,
  })
  source_storage: {
    id: number;
    location: string;
    cloud_storage_id: number;
  };

  @Prop({ required: true })
  assignee_updated_date: Date;

  // New fields added here
  @Prop({ default: 0 })
  shapes: number;

  @Prop({ default: 0 })
  tracks: number;

  @Prop({ default: 0 })
  objects: number;

  @Prop({ default: 0 })
  frames: number;

  @Prop({ default: 0 })
  export_objects: number;

  @Prop({ default: 0 })
  export_frames: number;

  @Prop({ default: false })
  hasGroundTruth: boolean;

  @Prop({ default: null })
  quality: number | null;

  @Prop({ required: false, default: false })
  deleted: boolean;
}

export const JobSchema = SchemaFactory.createForClass(Job);
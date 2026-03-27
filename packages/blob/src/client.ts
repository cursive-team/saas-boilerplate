import { S3Client } from '@aws-sdk/client-s3';
import type { BlobConfig } from './types.js';

let s3Client: S3Client | null = null;
let blobConfig: BlobConfig | null = null;

export function getBlobConfig(): BlobConfig {
  if (!blobConfig) {
    blobConfig = {
      endpoint: process.env.BUCKET_ENDPOINT || 'http://localhost:9000',
      accessKeyId: process.env.BUCKET_ACCESS_KEY_ID || 'minioadmin',
      secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY || 'minioadmin',
      bucket: process.env.BUCKET_NAME || 'app-storage',
      region: process.env.BUCKET_REGION || 'us-east-1',
    };
  }
  return blobConfig;
}

export function getS3Client(): S3Client {
  if (!s3Client) {
    const config = getBlobConfig();
    s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO and Railway
    });
  }
  return s3Client;
}

export function resetClient(): void {
  s3Client = null;
  blobConfig = null;
}

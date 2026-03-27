import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, getBlobConfig } from './client.js';
import type { PresignedUrlResult } from './types.js';

/**
 * Upload a file to blob storage (server-side upload)
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<string> {
  const client = getS3Client();
  const config = getBlobConfig();

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return key;
}

/**
 * Delete a file from blob storage
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client();
  const config = getBlobConfig();

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
}

/**
 * Check if a file exists in blob storage
 */
export async function fileExists(key: string): Promise<boolean> {
  const client = getS3Client();
  const config = getBlobConfig();

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a presigned URL for uploading a file directly from the client
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<PresignedUrlResult> {
  const client = getS3Client();
  const config = getBlobConfig();

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return { uploadUrl, key };
}

/**
 * Generate a presigned URL for downloading a file
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();
  const config = getBlobConfig();

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

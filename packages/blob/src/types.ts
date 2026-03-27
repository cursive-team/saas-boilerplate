export interface BlobConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
}

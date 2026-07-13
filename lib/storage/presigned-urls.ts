import "server-only"
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getS3Client, S3_BUCKET } from "@/lib/storage/s3-client"

interface PresignedUploadOptions {
  key: string
  contentType: string
  expiresInSeconds?: number
}

interface PresignedDownloadOptions {
  key: string
  expiresInSeconds?: number
}

/**
 * Generates a presigned PUT URL for direct client-to-S3 uploads.
 * The PDF never passes through the application server.
 */
export async function createPresignedUploadUrl({
  key,
  contentType,
  expiresInSeconds = 3600,
}: PresignedUploadOptions): Promise<string> {
  const client = getS3Client()
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

/**
 * Generates a presigned GET URL for private PDF access.
 * Short TTL ensures PDFs cannot be hotlinked or shared beyond intent.
 */
export async function createPresignedDownloadUrl({
  key,
  expiresInSeconds = 900, // 15 minutes — plenty for PDF.js to fetch
}: PresignedDownloadOptions): Promise<string> {
  const client = getS3Client()
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  })
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

/**
 * Builds the storage key for a drawing PDF.
 */
export function drawingStorageKey(companyId: string, projectId: string, filename: string): string {
  return `companies/${companyId}/projects/${projectId}/drawings/${filename}`
}

/**
 * Builds the storage key for a drawing thumbnail.
 */
export function thumbnailStorageKey(companyId: string, projectId: string, sheetId: string): string {
  return `companies/${companyId}/projects/${projectId}/thumbnails/${sheetId}.png`
}

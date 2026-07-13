import "server-only"
import { S3Client } from "@aws-sdk/client-s3"

let _client: S3Client | null = null

export function getS3Client(): S3Client {
  if (_client) return _client

  _client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  })

  return _client
}

export const S3_BUCKET = process.env.S3_BUCKET!

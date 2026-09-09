import { CreateBucketCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3_ENDPOINT/S3_FORCE_PATH_STYLE are dev-only (see .env) -- unset in
// production, where the SDK falls back to real AWS endpoints and
// virtual-hosted-style addressing on its own. AWS_REGION/AWS_ACCESS_KEY_ID/
// AWS_SECRET_ACCESS_KEY are the SDK's own default env var names, picked up
// automatically without an explicit `credentials` option.
const endpoint = process.env.S3_ENDPOINT;
export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  ...(endpoint ? { endpoint, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true" } : {}),
});

const BUCKET = process.env.S3_BUCKET!;

export function getPresignedUploadUrl(key: string, contentType: string) {
  return getSignedUrl(s3Client, new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }), {
    expiresIn: 300,
  });
}

export function getPresignedDownloadUrl(key: string) {
  return getSignedUrl(s3Client, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 300 });
}

// Dev convenience only -- mirrors "migrations run on every boot" (see
// backend/Dockerfile's dev CMD): auto-creates the bucket against the local
// RustFS container so a fresh clone needs zero manual setup. Gated on
// S3_ENDPOINT being set, i.e. this never runs against real production AWS.
if (endpoint) {
  await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET })).catch((err) => {
    const name = err instanceof Error ? err.name : undefined;
    if (name !== "BucketAlreadyOwnedByYou" && name !== "BucketAlreadyExists") throw err;
  });
}

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

// Direct server-side upload, not a presigned URL -- for content the
// backend already has in hand from a trusted caller (e.g. an admin's
// terms-and-conditions markdown, small text posted straight in a
// mutation's input) rather than a client uploading a file of its own.
export async function uploadObject(key: string, body: string, contentType: string) {
  await s3Client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
}

// Direct server-side read, same reasoning in reverse: for callers that want
// the actual text (e.g. terms-and-conditions.get prefilling an edit form)
// rather than a URL for the browser to fetch itself -- a real S3 bucket
// has no CORS policy configured by default, so a browser-side fetch()
// against a presigned URL would just fail; the backend has direct network
// access regardless.
export async function getObjectText(key: string): Promise<string> {
  const response = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return response.Body!.transformToString();
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

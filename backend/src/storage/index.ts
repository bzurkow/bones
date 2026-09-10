import {
  CreateBucketCommand,
  GetObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { trustedOrigins } from "../trusted-origins.js";

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

// Presigned URLs are handed to the *browser* (it PUTs an avatar directly,
// and GETs one to display it) -- and the browser can't resolve Docker's
// internal service hostname (S3_ENDPOINT=http://rustfs:9000, only
// meaningful inside the compose network this backend container runs in).
// It can only reach RustFS's port as published to the host machine
// (S3_PUBLIC_ENDPOINT=http://localhost:9000). A second client, differing
// only in `endpoint`, is used solely for *signing* -- getSignedUrl never
// makes a network call, it's a local computation, so this client being
// unreachable from inside the container doesn't matter; only the
// eventual requester (the browser) needs to reach the URL it produces.
// In production this collapses to the same client as s3Client
// (S3_PUBLIC_ENDPOINT unset there too, since real S3 has one publicly
// routable address for everyone -- no backend-vs-browser split at all).
// Found empirically, not assumed: the avatar upload flow is the first
// thing in this repo to actually exercise a browser hitting one of these
// URLs directly (terms-and-conditions' assetUrl is presigned the same way
// but nothing renders it yet -- see that router's own comment on why the
// admin UI fetches content server-side instead).
const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT ?? endpoint;
const presignClient = new S3Client({
  region: process.env.AWS_REGION,
  ...(publicEndpoint ? { endpoint: publicEndpoint, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true" } : {}),
});

// Two buckets, not one bucket with prefixes -- terms-and-conditions content
// (uploadObject/getObjectText, always read/written server-side) and avatars
// (presigned URLs, the browser talks to the bucket directly) have different
// enough access patterns to warrant separating them; see AVATAR_BUCKET's
// CORS setup below, which only the avatar bucket needs.
export const BUCKET = process.env.S3_BUCKET!;
export const AVATAR_BUCKET = process.env.S3_AVATAR_BUCKET!;

export function getPresignedUploadUrl(bucket: string, key: string, contentType: string) {
  return getSignedUrl(presignClient, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), {
    expiresIn: 300,
  });
}

export function getPresignedDownloadUrl(bucket: string, key: string) {
  return getSignedUrl(presignClient, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 });
}

// Direct server-side upload, not a presigned URL -- for content the
// backend already has in hand from a trusted caller (e.g. an admin's
// terms-and-conditions markdown, small text posted straight in a
// mutation's input) rather than a client uploading a file of its own.
// Always BUCKET -- nothing writes trusted server-side content into the
// avatar bucket.
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
// backend/Dockerfile's dev CMD): auto-creates both buckets against the
// local RustFS container so a fresh clone needs zero manual setup. Gated on
// S3_ENDPOINT being set, i.e. this never runs against real production AWS.
if (endpoint) {
  for (const bucket of [BUCKET, AVATAR_BUCKET]) {
    await s3Client.send(new CreateBucketCommand({ Bucket: bucket })).catch((err) => {
      const name = err instanceof Error ? err.name : undefined;
      if (name !== "BucketAlreadyOwnedByYou" && name !== "BucketAlreadyExists") throw err;
    });
  }

  // Avatar bucket only: the browser PUTs (upload) and GETs (display) it
  // directly with a presigned URL -- a real cross-origin request the
  // *bucket itself* has to answer CORS for, unlike BUCKET's terms-and-
  // conditions content, which only ever goes through the backend
  // (uploadObject/getObjectText above). trustedOrigins is already the
  // canonical allowed-client-origins list (Better Auth + Fastify CORS both
  // read it), reused here rather than a third copy. In production this
  // targets real AWS S3, which supports this same PutBucketCorsCommand --
  // this call isn't RustFS-specific despite being dev-gated by `endpoint`
  // for auto-provisioning purposes; a real deploy would set the equivalent
  // bucket CORS policy via infra-as-code instead of this bootstrap.
  await s3Client.send(
    new PutBucketCorsCommand({
      Bucket: AVATAR_BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedMethods: ["PUT", "GET"],
            AllowedOrigins: trustedOrigins,
            AllowedHeaders: ["*"],
          },
        ],
      },
    }),
  );
}

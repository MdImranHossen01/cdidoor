import { S3Client, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID || '2a9302464bab79b94f3b96091e05eaa5';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '8d6ad7c48293e166cbf8f9d2ec9fd48e';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '53554534cf0a5d79d00bb925cd285f3c9568788b1d86dec6384170c5bd0e3d22';
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'cdidoorind-media';
export const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://cdn.cdidoorind.com').replace(/\/$/, '');

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Extracts the storage key from a full public R2 URL or relative path.
 * e.g., "https://cdn.cdidoorind.com/cdidoorind/products/abc.webp" -> "cdidoorind/products/abc.webp"
 */
export function extractR2Key(urlOrKey: string): string | null {
  if (!urlOrKey) return null;
  const trimmed = urlOrKey.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  }

  try {
    const urlObj = new URL(trimmed);
    const pathname = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    return pathname || null;
  } catch {
    return null;
  }
}

/**
 * Delete a single object from Cloudflare R2
 */
export async function deleteFromR2(urlOrKey: string): Promise<boolean> {
  const key = extractR2Key(urlOrKey);
  if (!key) return false;

  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    console.error('Error deleting object from R2:', key, err);
    return false;
  }
}

/**
 * Delete multiple objects from Cloudflare R2 in a single batch
 */
export async function deleteMultipleFromR2(urlsOrKeys: string[]): Promise<boolean> {
  const keys = urlsOrKeys
    .map(extractR2Key)
    .filter((k): k is string => Boolean(k));

  if (keys.length === 0) return true;

  try {
    await r2Client.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
    return true;
  } catch (err) {
    console.error('Error batch deleting objects from R2:', keys, err);
    return false;
  }
}


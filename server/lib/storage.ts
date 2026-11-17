import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { env, r2Enabled } from "../env";

export const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

const s3 = r2Enabled
  ? new S3Client({
      region: "auto",
      endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey },
    })
  : null;

/**
 * Normalises an uploaded photo (auto-rotate, cap at 1800px, WebP) and stores it
 * in Cloudflare R2 when configured, otherwise on local disk. Local disk is fine
 * for development but is wiped on every Railway deploy.
 */
export async function storeImage(input: Buffer) {
  const body = await sharp(input)
    .rotate()
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer();
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}.webp`;

  if (s3) {
    const key = `products/${name}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: env.r2.bucket,
        Key: key,
        Body: body,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${env.r2.publicUrl}/${key}`;
  }

  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, name), body);
  return `/uploads/${name}`;
}

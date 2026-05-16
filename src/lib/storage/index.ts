// src/lib/storage/index.ts
// Storage abstraction — swap local ↔ S3 ↔ R2 via env variable

import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

export interface StorageProvider {
  upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder?: string
  ): Promise<{ url: string; key: string }>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expirySeconds?: number): Promise<string>;
}

// =============================================================
// LOCAL STORAGE PROVIDER
// =============================================================

class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    this.basePath = process.env.LOCAL_STORAGE_PATH || "./uploads";
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }

  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = "files"
  ): Promise<{ url: string; key: string }> {
    const ext = path.extname(originalName);
    const fileName = `${randomUUID()}${ext}`;
    const dir = path.join(this.basePath, folder);

    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, fileName);
    await fs.writeFile(filePath, buffer);

    const key = `${folder}/${fileName}`;
    const url = `${this.baseUrl}/api/v1/files/${key}`;

    return { url, key };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key);
    await fs.unlink(filePath).catch(() => {});
  }

  async getSignedUrl(key: string, _expirySeconds = 3600): Promise<string> {
    // For local storage, return the direct URL
    return `${this.baseUrl}/api/v1/files/${key}`;
  }
}

// =============================================================
// S3 STORAGE PROVIDER (stub — add aws-sdk when deploying)
// =============================================================

class S3StorageProvider implements StorageProvider {
  async upload(
    _buffer: Buffer,
    originalName: string,
    _mimeType: string,
    folder = "files"
  ): Promise<{ url: string; key: string }> {
    // TODO: import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
    // const client = new S3Client({ region: process.env.AWS_REGION })
    // ...
    throw new Error(
      "S3 provider not configured. Install @aws-sdk/client-s3 and implement."
    );
  }

  async delete(_key: string): Promise<void> {
    throw new Error("S3 provider not configured.");
  }

  async getSignedUrl(_key: string, _expirySeconds = 3600): Promise<string> {
    throw new Error("S3 provider not configured.");
  }
}

// =============================================================
// FACTORY — select provider from env
// =============================================================

function createStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || "local";

  switch (provider) {
    case "s3":
      return new S3StorageProvider();
    case "local":
    default:
      return new LocalStorageProvider();
  }
}

export const storage = createStorageProvider();

// =============================================================
// HELPERS
// =============================================================

export function getFileSizeFromBuffer(buffer: Buffer): number {
  return buffer.length;
}

export function isAllowedMimeType(
  mimeType: string,
  allowed: string[]
): boolean {
  return allowed.some((a) => {
    if (a.endsWith("/*")) {
      return mimeType.startsWith(a.slice(0, -1));
    }
    return mimeType === a;
  });
}

export const ALLOWED_RECORDING_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
];

export const ALLOWED_ATTACHMENT_TYPES = [
  "image/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "audio/mpeg",
  "audio/wav",
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

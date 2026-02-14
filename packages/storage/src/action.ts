"use server";

/**
 * Storage API route handlers and actions
 * Single source of truth for all storage operations
 */
import { headers } from "next/headers";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlV4 } from "@aws-sdk/s3-request-presigner";
import { inArray } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { files } from "@workspace/drizzle/schema";

import { getStorageConfig } from "./client";
import { pathFromUrl } from "./utils";

// Initialize S3 client
let s3: S3Client | null = null;
let bucket: string | null = null;
let publicUrl: string | null = null;

/**
 * Initialize S3 client from config or environment variables
 */
function getS3Client() {
  if (!s3 || !bucket) {
    const config = getStorageConfig();

    const region = config?.region || process.env.AWS_BUCKET_ORIGIN;
    const bucketName = config?.bucket || process.env.AWS_BUCKET_NAME;
    const accessKeyId = config?.accessKeyId || process.env.AWS_ACCESS_KEY_VALUE;
    const secretAccessKey =
      config?.secretAccessKey || process.env.AWS_SECRET_KEY_VALUE;
    const publicUrlValue = config?.publicUrl || process.env.NEXT_PUBLIC_AWS_URL;

    if (!region || !bucketName || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "S3 storage not initialized. Set AWS environment variables or initialize StorageClient with config."
      );
    }

    s3 = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    bucket = bucketName;
    publicUrl = publicUrlValue || null;
  }
  return { s3, bucket: bucket!, publicUrl };
}

/**
 * Generates a signed URL for uploading files
 * @param key - The storage key/path for the file
 * @returns Promise<{data?: string, error?: string}> - Signed URL for file upload (expires in 1 minute)
 */
const getSignedUrl = async (key: string) => {
  try {
    const { s3, bucket } = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const signedUrl = await getSignedUrlV4(s3, command, {
      expiresIn: 60, // 1 minute
    });
    return { data: signedUrl };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate signed URL",
    };
  }
};

/**
 * Deletes multiple files from storage
 * @param urls - Array of storage URLs/keys to delete
 * @returns Promise<{data?: void, error?: string}>
 */
const deleteFilesFromStorage = async (urls: string[]) => {
  try {
    const { s3, bucket } = getS3Client();
    const keys = urls.map((url) => pathFromUrl(url) || url).filter(Boolean);
    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
      },
    });
    await s3.send(command);

    await db.delete(files).where(inArray(files.url, urls));

    return { urls, success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete files from S3",
    };
  }
};

/**
 * Generates a signed URL for accessing/downloading files
 * @param url - The storage URL or key of the file
 * @param expiresIn - Expiration time in seconds for the signed URL
 * @returns Promise<{data?: string, error?: string}> - Signed URL for file access
 */
const generatePublicUrl = async ({
  url,
  expiresIn,
}: {
  url: string;
  expiresIn: number;
}) => {
  try {
    const { s3, bucket } = getS3Client();
    const key = pathFromUrl(url) || url;
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const signedUrl = await getSignedUrlV4(s3, command, {
      expiresIn,
    });
    return { data: signedUrl };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate public URL",
    };
  }
};

/**
 *
 * @param file - The file to add to the S3 bucket
 * @returns
 */
const addFile = async (props: {
  name: string;
  isPublic: boolean;
  url: string;
  size: number;
  contentType: string;
  height: number;
  width: number;
}) => {
  try {
    const headersList = new Headers(await headers());
    const userId = headersList.get("X-User-ID");

    const { name, isPublic, url, size, contentType, height, width } = props;

    await db.insert(files).values({
      url,
      name,
      size,
      contentType,
      userId: userId,
      isPublic,
      height,
      width,
    });

    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to add file to S3",
    };
  }
};

export { getSignedUrl, deleteFilesFromStorage, generatePublicUrl, addFile };

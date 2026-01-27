import { StorageClient } from "@workspace/storage";

export const storage = new StorageClient({
  region: process.env.AWS_BUCKET_ORIGIN!,
  bucket: process.env.AWS_BUCKET_NAME!,
  accessKeyId: process.env.AWS_ACCESS_KEY_VALUE!,
  secretAccessKey: process.env.AWS_SECRET_KEY_VALUE!,
  allowedPaths: ["public", "public/users"] as const,
});

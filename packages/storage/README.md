# @workspace/storage

A reusable, platform-agnostic storage package that supports multiple storage backends (S3, local, etc.) with a simple, unified API.

## Features

- ⚙️ **Configurable** - Initialize once per app with your preferred storage backend
- 🎯 **Type-safe** - Full TypeScript support with type-safe paths
- 🚀 **Simple API** - One client to get everything you need
- 🌐 **API Routes** - Simple Next.js API route handlers with native fetch
- 📦 **Type-safe paths** - Restrict upload paths using `allowedPaths` configuration

## Installation

The package is already included in the monorepo. For external projects:

```bash
pnpm add @workspace/storage
```

## Quick Start

### 1. Initialize Storage Client

Create a storage client in your app (e.g., `lib/storage.ts`):

```ts
import { StorageClient } from "@workspace/storage";

export const storage = new StorageClient({
  region: process.env.AWS_BUCKET_ORIGIN!,
  bucket: process.env.AWS_BUCKET_NAME!,
  accessKeyId: process.env.AWS_ACCESS_KEY_VALUE!,
  secretAccessKey: process.env.AWS_SECRET_KEY_VALUE!,
  publicUrl: process.env.NEXT_PUBLIC_AWS_URL, // Optional
  allowedPaths: ["public", "organization", "organization/first"] as const, // Type-safe paths
});
```

### 2. Use in React Components

```tsx
import { storage } from "@/lib/storage";

function MyComponent() {
  const { useUpload } = storage;
  const { uploadFiles, isUploading, progress } = useUpload(userId);

  const handleUpload = async () => {
    const files = // ... get files
    const urls = await uploadFiles(files, {
      path: "public/uploads",
      randomFileName: true,
    });
  };

  return (
    <div>
      {isUploading && <p>Uploading... {progress}%</p>}
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}
```

### 3. Use in Server Components or API Routes

```ts
import { storage } from "@/lib/storage";

// Get a signed URL for uploading
const { data: signedUrl, error } =
  await storage.getSignedUrl("path/to/file.jpg");

// Add file metadata to database
await storage.addFile({
  name: "file.jpg",
  url: "https://...",
  size: 1024,
  contentType: "image/jpeg",
  userId: "user-123",
  isPublic: true,
});
```

### 4. Create API Routes (Next.js)

Create a simple API route file:

Create `app/api/storage/[route]/route.ts`:

```ts
export { POST } from "@workspace/storage/api-handlers";
```

This exposes the following endpoints:

- `POST /api/storage/getSignedUrl` - Get signed URL for uploading files
- `POST /api/storage/deleteFiles` - Delete files from storage
- `POST /api/storage/generatePublicUrl` - Generate public URL for accessing files

**Example usage from client:**

```ts
import { createStorageClient } from "@workspace/storage/client-http";

const client = createStorageClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
});

// Get signed URL
const { data, error } = await client.getSignedUrl("public/uploads/file.jpg");
if (error) {
  console.error("Failed:", error);
  return;
}

// Delete files
const { error: deleteError } = await client.deleteFiles([
  "https://...",
  "https://...",
]);

// Generate public URL
const { data: publicUrl, error: urlError } = await client.generatePublicUrl(
  "https://...",
  3600 // 1 hour
);
```

## Configuration

### S3 Configuration

```ts
import { StorageClient } from "@workspace/storage";

export const storage = new StorageClient({
  region: "us-east-1",
  bucket: "my-bucket",
  accessKeyId: "AKIA...",
  secretAccessKey: "secret...",
  publicUrl: "https://cdn.example.com", // Optional custom CDN URL
  allowedPaths: ["public", "private"] as const, // Optional: restrict upload paths
});
```

### Environment Variables

Required for S3:

- `AWS_BUCKET_ORIGIN` - AWS region
- `AWS_BUCKET_NAME` - S3 bucket name
- `AWS_ACCESS_KEY_VALUE` - AWS access key
- `AWS_SECRET_KEY_VALUE` - AWS secret key
- `NEXT_PUBLIC_AWS_URL` - Optional public URL prefix

## API Reference

### Storage Client

```ts
import { StorageClient } from "@workspace/storage";

const storage = new StorageClient(config);

// Server-side actions
await storage.getSignedUrl("path/to/file");
await storage.deleteFilesFromStorage(["path1", "path2"]);
await storage.generatePublicUrl({ url: "path/to/file", expiresIn: 3600 });

// Client-side hooks
const { useUpload } = storage;
const { uploadFiles } = useUpload();
```

### Actions (Server-side)

- `getSignedUrl(key: string)` - Get signed URL for upload
- `deleteFilesFromStorage(urls: string[])` - Delete files from storage
- `generatePublicUrl({ url, expiresIn })` - Generate signed URL for access
- `addFile(props)` - Add file metadata to database
- `deleteFiles(paths: string[])` - Delete files from storage and database
- `getFiles({ searchByUrl? })` - Fetch files from database

### Hooks (Client-side)

- `useUpload(userId?: string)` - Upload files with progress tracking
  - `uploadFiles(files, options)` - Upload multiple files
  - `deleteFilesMutation` - Delete files mutation
  - `generatePublicUrlMutation` - Generate public URL mutation

## Server-Side Usage

For server-side operations, you can use the storage server actions directly:

```ts
import {
  deleteFilesFromStorage,
  generatePublicUrl,
  getSignedUrl,
} from "@workspace/storage/action";

// Get signed URL
const { data: signedUrl, error } = await getSignedUrl("public/file.jpg");
if (error) {
  console.error("Failed:", error);
  return;
}

// Delete files
const { error: deleteError } = await deleteFilesFromStorage([
  "https://bucket.s3.amazonaws.com/file1.jpg",
  "https://bucket.s3.amazonaws.com/file2.jpg",
]);

// Generate public URL
const { data: publicUrl, error: urlError } = await generatePublicUrl({
  url: "https://bucket.s3.amazonaws.com/file.jpg",
  expiresIn: 3600, // 1 hour
});
```

**Features:**

- ✅ **Server Actions** - Uses Next.js "use server" for direct function calls
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Simple & stable** - No API routes needed, call functions directly
- ✅ **Automatic user ID** - User ID is automatically extracted from headers if available

## Migration Guide

If you're migrating from the old storage implementation:

1. **Add initialization** - Call `initStorage()` in your app setup
2. **Update imports** - Actions remain the same, but ensure storage is initialized
3. **Remove auth dependency** - `useUpload` now accepts `userId` as a parameter instead of using `useCurrentUser`

## Examples

See the apps in this monorepo for complete examples of storage initialization and usage.

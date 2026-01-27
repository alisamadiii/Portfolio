/**
 * Storage configuration
 */
export type StorageConfig = {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string; // Optional custom public URL prefix
  allowedPaths?: readonly string[]; // Array of allowed storage paths
};
// | {
//     provider: "local";
//     basePath: string;
//     publicUrl: string;
//   }
// | {
//     provider: "custom";
//     // Custom provider implementation
//     [key: string]: unknown;
//   };

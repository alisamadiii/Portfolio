import { initStorage, isStorageInitialized } from "./client";
import { useDeleteFilesMutation } from "./mutations/use-delete-files";
import { useGeneratePublicUrlMutation } from "./mutations/use-generate-public-url";
import { createUseUpload } from "./mutations/use-upload";
import type { StorageConfig } from "./types";

/**
 * Type helper for StorageClient config
 */
type StorageClientConfig<T extends StorageConfig | undefined> = T;

export class StorageClient<
  TConfig extends StorageConfig | undefined = StorageConfig,
> {
  private allowedPaths: readonly string[] | undefined;

  // Hooks - useUpload is now type-safe based on allowedPaths
  useUpload: ReturnType<typeof createUseUpload<TConfig>>;
  useDeleteFilesMutation = useDeleteFilesMutation;
  useGeneratePublicUrlMutation = useGeneratePublicUrlMutation;

  /**
   * Create a new storage client instance
   * @param config - Storage configuration (can include apiBaseUrl and apiPath for HTTP client)
   */
  constructor(config?: StorageClientConfig<TConfig>) {
    // Store allowed paths
    this.allowedPaths = config?.allowedPaths;

    // Initialize if config is provided
    if (config) {
      // Type assertion: config should be StorageConfig
      // Using double assertion because TConfig might be undefined, but we know config exists
      // and it must extend StorageConfig (required fields are checked at runtime)
      initStorage(config as unknown as StorageConfig);
    } else if (!isStorageInitialized()) {
      throw new Error(
        "Storage client not initialized. Provide config to StorageClient constructor or call initStorage() first."
      );
    }

    // Create type-safe useUpload hook
    this.useUpload = createUseUpload<TConfig>(this.allowedPaths);
  }

  /**
   * Get the allowed paths for this storage client
   */
  getAllowedPaths() {
    return this.allowedPaths;
  }
}

// Export types and utilities
export type { StorageConfig } from "./types";
export { initStorage, isStorageInitialized, getStorageConfig } from "./client";

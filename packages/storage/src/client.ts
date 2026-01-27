import type { StorageConfig } from "./types";

let storageConfig: StorageConfig | null = null;

/**
 * Initialize storage configuration
 * Stores config for action.ts to use
 *
 * @param config - Storage configuration
 */
export function initStorage(config: StorageConfig): void {
  storageConfig = config;
}

/**
 * Get storage configuration (used by action.ts)
 */
export function getStorageConfig(): StorageConfig | null {
  return storageConfig;
}

/**
 * Check if storage is initialized
 */
export function isStorageInitialized(): boolean {
  return storageConfig !== null;
}

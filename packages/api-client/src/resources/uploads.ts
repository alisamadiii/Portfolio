import type { AgencyClient } from "../client.js";
import { AgencyError, fail, ok, type Result } from "../error.js";
import type {
  DeleteUploadRequest,
  ListObjectsParams,
  ListObjectsResponse,
  PresignUploadRequest,
  PresignUploadResponse,
  UploadOptions,
  UploadResult,
} from "../types.js";

export class UploadsResource {
  constructor(private readonly client: AgencyClient) {}

  /** Get a signed PUT URL for uploading a file directly to storage. */
  presign(
    params: PresignUploadRequest
  ): Promise<Result<PresignUploadResponse>> {
    return this.client.request("POST", "/v1/uploads/presign", {
      body: params,
    });
  }

  /** Delete an object from your bucket by key. */
  delete(params: DeleteUploadRequest): Promise<Result<null>> {
    return this.client.request("DELETE", "/v1/uploads", { body: params });
  }

  /** List objects in your bucket. Paginate with nextCursor. */
  list(params?: ListObjectsParams): Promise<Result<ListObjectsResponse>> {
    return this.client.request("GET", "/v1/uploads/objects", {
      query: { prefix: params?.prefix, cursor: params?.cursor },
    });
  }

  /**
   * Presign and upload in one call. The PUT goes straight to storage with
   * the signature in the URL — deliberately no Authorization header, which
   * would break the signature.
   */
  async upload(
    file: File | Blob,
    options: UploadOptions = {}
  ): Promise<Result<UploadResult>> {
    const filename =
      options.filename ?? (file instanceof File ? file.name : undefined);
    if (!filename) {
      return fail(
        new AgencyError(
          0,
          "MISSING_FILENAME",
          "Pass options.filename when uploading a Blob without a name."
        )
      );
    }

    const presigned = await this.presign({
      filename,
      contentType:
        options.contentType || file.type || "application/octet-stream",
      contentLength: file.size,
      path: options.path,
      naming: options.naming,
      overwrite: options.overwrite,
    });
    if (presigned.error) return presigned;

    const { uploadUrl, headers, key, publicUrl, bucket } = presigned.data;

    let put: Response;
    try {
      put = await fetch(uploadUrl, { method: "PUT", headers, body: file });
    } catch (err) {
      return fail(
        new AgencyError(
          0,
          "NETWORK_ERROR",
          err instanceof Error ? err.message : "upload failed"
        )
      );
    }
    if (!put.ok) {
      return fail(
        new AgencyError(
          put.status,
          "UPLOAD_FAILED",
          "PUT to the presigned URL failed with status " + put.status
        )
      );
    }

    return ok({ key, publicUrl, bucket });
  }
}

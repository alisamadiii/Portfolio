const CLOUDFLARE_STREAM_HOST = "cloudflarestream.com";

/**
 * Gets the thumbnail URL for a Cloudflare Stream video.
 *
 * Pattern:
 * - Video: https://customer-XXX.cloudflarestream.com/<videoId>/manifest/video.m3u8
 * - Thumbnail: https://customer-XXX.cloudflarestream.com/<videoId>/thumbnails/thumbnail.jpg
 *
 * @param videoUrl - Full Cloudflare Stream video URL (e.g. manifest .m3u8 or playback URL)
 * @returns Thumbnail URL, or null if the URL is not a Cloudflare Stream URL
 */
export function getCloudflareStreamThumbnailUrl(
  videoUrl: string,
  time?: string
): string | null {
  try {
    const url = new URL(videoUrl);
    if (!url.hostname.includes(CLOUDFLARE_STREAM_HOST)) {
      return null;
    }

    // Video ID is the first path segment (e.g. /d94d67935d5bfa446a9a910cb6ef2291/manifest/...)
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const videoId = pathSegments[0];
    if (!videoId) {
      return null;
    }

    const origin = url.origin;
    return `${origin}/${videoId}/thumbnails/thumbnail.jpg?width=1500&time=${time}`;
  } catch {
    return null;
  }
}

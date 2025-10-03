import { Video, VIDEOS_API_BASE_URL } from "@/lib/api/videos";

const AREWAFLIX_BASE_URL = "https://arewaflix.com";
const AREWAFLIX_SUFFIX = "_1ff1rx1dDLBkD57.html";

/**
 * Converts a video title to a URL slug format
 * Example: "Zafin Nema Season 1 Episode 12" -> "zafin-nema-season-1-episode-12"
 */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generates ArewaFlix watch URL from video title
 * Example: "Zafin Nema Season 1 Episode 12" -> "https://arewaflix.com/watch/zafin-nema-season-1-episode-12_1ff1rx1dDLBkD57.html"
 */
export function generateArewaFlixUrl(title: string): string {
  const slug = titleToSlug(title);
  return `${AREWAFLIX_BASE_URL}/watch/${slug}${AREWAFLIX_SUFFIX}`;
}

const VIDEO_FILE_EXTENSIONS = [
  "mp4",
  "m4v",
  "mov",
  "webm",
  "mkv",
  "avi",
  "flv",
  "wmv",
  "m3u8",
  "ts",
  "m2ts",
];

const MEDIA_CANDIDATE_KEYS = [
  "video_location",
  "videoLocation",
  "video_url",
  "videoUrl",
  "videoFile",
  "video_file",
  "video",
  "source",
  "source_url",
  "sourceUrl",
  "stream_url",
  "streamUrl",
  "stream",
  "download_url",
  "downloadUrl",
  "embed",
  "embed_code",
  "embedCode",
  "iframe",
  "iframe_src",
  "iframeSrc",

  "short_id",
  "shortId",
  "short_code",
  "shortCode",
  "code",
  "url",
];

const MEDIA_COLLECTION_KEYS = ["sources", "videos", "urls", "media", "embeds"];

export type VideoMedia =
  | { kind: "direct"; uri: string }
  | { kind: "external"; videoId: string; watchUrl: string }
  | { kind: "none" };

export type VideoPlaybackSource =
  | {
      origin: "direct";
      uri: string;
      sourceUrl: string;
      media: Extract<VideoMedia, { kind: "direct" }>;
    }
  | {
      origin: "external";
      uri: null;
      watchUrl: string;
      videoId: string;
      media: Extract<VideoMedia, { kind: "external" }>;
    };

export function collectMediaCandidates(video: Video): string[] {
  const seen = new Set<string>();

  const addCandidate = (value: unknown) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    seen.add(trimmed);
  };

  addCandidate(video.videoLocation);

  const raw = (video.raw ?? {}) as Record<string, unknown>;

  MEDIA_CANDIDATE_KEYS.forEach((key) => addCandidate(raw[key]));

  MEDIA_COLLECTION_KEYS.forEach((key) => {
    const value = raw[key];
    if (Array.isArray(value)) {
      value.forEach((entry) => addCandidate(entry));
    }
  });

  return Array.from(seen);
}

function hasPathIndicators(value: string): boolean {
  return value.includes("/") || /\.[a-z0-9]{2,4}(\?|$)/i.test(value);
}

function normalizeHttpUrl(candidate: string): string | undefined {
  const trimmed = candidate.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/{2}/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return `${VIDEOS_API_BASE_URL}${trimmed}`;
  }

  return undefined;
}

export function resolveDirectVideoUrl(candidate: string): string | undefined {
  const trimmed = candidate.trim();
  if (!trimmed) return undefined;

  const lower = trimmed.toLowerCase();
  const hasExtension = VIDEO_FILE_EXTENSIONS.some((ext) =>
    lower.includes(`.${ext}`)
  );

  const qualifiesAsPath = hasExtension || hasPathIndicators(trimmed);

  const normalized = normalizeHttpUrl(trimmed);
  if (normalized) {
    return qualifiesAsPath ? normalized : undefined;
  }

  if (!qualifiesAsPath) {
    return undefined;
  }

  const sanitized = trimmed.replace(/^\/+/, "");
  return `${VIDEOS_API_BASE_URL}/${sanitized}`;
}

export function resolveVideoMedia(video: Video): VideoMedia {
  const candidates = collectMediaCandidates(video);

  // First, try to find direct video URLs
  for (const candidate of candidates) {
    const direct = resolveDirectVideoUrl(candidate);
    if (direct) {
      return { kind: "direct", uri: direct };
    }
  }

  // If no direct video found, check if this is a YouTube video
  // (has videoId but no videoLocation)
  if (video.videoId && !video.videoLocation) {
    const watchUrl = generateArewaFlixUrl(video.title);
    return {
      kind: "external",
      videoId: video.videoId,
      watchUrl,
    };
  }

  return { kind: "none" };
}

export async function resolveVideoPlaybackSource(
  video: Video,
  options: { media?: VideoMedia } = {}
): Promise<VideoPlaybackSource | null> {
  const { media: providedMedia } = options;
  const media = providedMedia ?? resolveVideoMedia(video);

  if (media.kind === "none") {
    return null;
  }

  if (media.kind === "direct") {
    return {
      origin: "direct",
      uri: media.uri,
      sourceUrl: media.uri,
      media,
    };
  }

  if (media.kind === "external") {
    return {
      origin: "external",
      uri: null,
      watchUrl: media.watchUrl,
      videoId: media.videoId,
      media,
    };
  }

  return null;
}

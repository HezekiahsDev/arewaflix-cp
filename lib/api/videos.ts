import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

const DEFAULT_BASE_URL = "https://api.arewaflix.io";

const API_BASE_URL = getSanitizedBaseUrl(
  typeof process !== "undefined" && process.env
    ? process.env.EXPO_PUBLIC_API_BASE_URL
    : undefined
);

const SERVICE_BASE_URL = `${API_BASE_URL}/api/v1/videos`;

const FALLBACK_THUMBNAIL =
  "https://placehold.co/600x338/111827/FFFFFF?text=ArewaFlix";

export const VIDEOS_API_BASE_URL = API_BASE_URL;

export type RawVideo = {
  id?: string | number;
  title?: string;
  slug?: string;
  description?: string;
  thumbnail?: string;
  image_url?: string;
  poster?: string;
  banner?: string;
  cover?: string;
  duration?: string | number | null;
  length_seconds?: number | string | null;
  readable_duration?: string | null;
  video_location?: string;
  views?: number | string | null;
  view_count?: number | string | null;
  comments?: number | string | null;
  likes?: number | string | null;
  channel?: string | null;
  channel_name?: string | null;
  author?: string | null;
  author_name?: string | null;
  uploader?: string | null;
  category?: string | null;
  category_name?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  published_at?: string | null;
  publishedAt?: string | null;
  is_short?: number | boolean | null;
  isShort?: number | boolean | null;
  [key: string]: unknown;
};

export type Video = {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  imageUrl: string;
  duration?: string;
  durationSeconds?: number;
  views?: number;
  comments?: number;
  likes?: number;
  author?: string;
  category?: string;
  createdAt?: string;
  videoLocation?: string;
  videoId?: string;
  isShort: boolean;
  raw?: RawVideo;
};

export type FetchVideosOptions = {
  limit?: number;
  page?: number;
  sort?: "most_viewed" | "popular" | "top_rated" | "latest" | "oldest";
  signal?: AbortSignal;
  headers?: HeadersInit;
};

type QueryParams = Record<string, string | number | undefined>;

type ApiResponse = {
  data?: RawVideo[];
  [key: string]: unknown;
};

export async function fetchVideos(
  options: FetchVideosOptions = {}
): Promise<Video[]> {
  const { limit, page, signal, headers } = options;

  const data = await request("/", { limit, page }, { signal, headers });
  return data.map(normalizeVideo);
}

export async function fetchFeaturedVideos(
  options: FetchVideosOptions = {}
): Promise<Video[]> {
  const { limit, page, signal, headers } = options;

  const data = await request(
    "/filter",
    { featured: 1, limit, page },
    { signal, headers }
  );

  return data.map(normalizeVideo);
}

export async function fetchFilteredVideos(
  sort: NonNullable<FetchVideosOptions["sort"]>,
  options: FetchVideosOptions = {}
): Promise<Video[]> {
  const { limit, page, signal, headers } = options;
  const data = await request(
    "/filter",
    { sort, limit, page },
    {
      signal,
      headers,
    }
  );

  return data.map(normalizeVideo);
}

export async function fetchShorts(
  options: FetchVideosOptions = {}
): Promise<Video[]> {
  const { limit, page, sort, signal, headers } = {
    sort: "latest",
    ...options,
  };

  const data = await request(
    "/shorts",
    { sort, limit, page },
    { signal, headers }
  );

  return data.map((video) => normalizeVideo({ ...video, is_short: true }));
}

/**
 * Fetch videos saved by the authenticated user
 */
export async function fetchSavedVideos(
  options: FetchVideosOptions = {}
): Promise<Video[]> {
  const { limit, page, signal, headers } = options;

  const data = await request("/saved", { limit, page }, { signal, headers });
  return data.map(normalizeVideo);
}

export async function fetchRandomVideos(
  options: FetchVideosOptions = {}
): Promise<Video[]> {
  const { limit, page, signal, headers } = options;

  const data = await request(
    "/random",
    { limit, page, approved: 1, privacy: 0 },
    { signal, headers }
  );

  return data.map(normalizeVideo);
}

export type SearchVideosOptions = {
  q: string;
  limit?: number;
  page?: number;
  approved?: 0 | 1;
  privacy?: 0 | 1;
  featured?: 0 | 1;
  signal?: AbortSignal;
  headers?: HeadersInit;
};

export async function searchVideos(
  options: SearchVideosOptions
): Promise<Video[]> {
  const { q, limit, page, approved, privacy, featured, signal, headers } =
    options;

  if (!q || !q.trim()) {
    return [];
  }

  const data = await request(
    "/search",
    { q: q.trim(), limit, page, approved, privacy, featured },
    { signal, headers }
  );

  return data.map(normalizeVideo);
}

function getSanitizedBaseUrl(value?: string): string {
  const base = (value && value.trim()) || DEFAULT_BASE_URL;
  const trimmed = base.replace(/\/$/, "");
  return resolveLoopbackHost(trimmed);
}

async function request(
  path: string,
  params: QueryParams = {},
  init: Pick<RequestInit, "signal" | "headers"> = {}
): Promise<RawVideo[]> {
  const query = buildQuery(params);
  const url = `${SERVICE_BASE_URL}${path}${query}`;

  // Build headers in a deterministic way so we can optionally attach
  // the Authorization header when an auth token exists in AsyncStorage.
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });

  // Merge any provided headers from the caller
  if (init.headers) {
    const provided = new Headers(init.headers as HeadersInit);
    provided.forEach((value, key) => headers.set(key, value));
  }

  // If an Authorization header wasn't provided, attempt to load the
  // stored auth token and attach it. This ensures authenticated users
  // receive filtered results while unauthenticated users get the
  // unfiltered feed.
  if (!headers.has("Authorization")) {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch (e) {
      // Ignore storage errors and proceed without auth header.
      // Do not fail the request because of storage issues.
      console.warn("videos.request: failed to read auth token", e);
    }
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    signal: init.signal,
  });

  if (!response.ok) {
    throw new Error(
      `Request to ${url} failed with status ${response.status}: ${response.statusText}`
    );
  }

  const payload = (await response.json()) as ApiResponse;

  if (!payload || !Array.isArray(payload.data)) {
    throw new Error(`Unexpected response shape from ${url}`);
  }

  return payload.data;
}

function buildQuery(params: QueryParams): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.append(key, String(value));
  });

  const search = searchParams.toString();
  return search ? `?${search}` : "";
}

function normalizeVideo(video: RawVideo): Video {
  const idSource =
    video.id ??
    (typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `video-${Math.random().toString(36).slice(2)}`);

  // The backend returns thumbnails as relative paths like
  // "upload/photos/2025/..._image.png" — resolve against the API base URL.
  const imageUrl = getImageUrlFromVideo(video) ?? FALLBACK_THUMBNAIL;
  const durationSeconds = coerceNumber(extractFirst(["length_seconds"], video));
  const duration = normalizeDuration(
    extractFirst(["duration", "readable_duration"], video),
    durationSeconds
  );
  const views = coerceNumber(extractFirst(["views", "view_count"], video));
  const comments = coerceNumber(video.comments);
  const likes = coerceNumber(video.likes);
  const author = asOptionalString(
    extractFirst(
      ["author", "author_name", "channel", "channel_name", "uploader"],
      video
    )
  );
  const category = asOptionalString(
    extractFirst(["category", "category_name"], video)
  );
  const createdAt = asOptionalString(
    // Backend sometimes provides `time` as a UNIX timestamp (seconds).
    // Prefer explicit created_at/published_at fields, otherwise fall back to `time`.
    extractFirst(
      [
        "created_at",
        "createdAt",
        "published_at",
        "publishedAt",
        // `time` is a number (e.g. 1737635258) representing seconds since epoch
        // we'll convert it to an ISO string below when creating the model.
        "time",
      ],
      video
    )
  );
  const videoLocation = asOptionalString(
    extractFirst(["video_location", "videoLocation"], video)
  );
  const videoId = asOptionalString(
    extractFirst(["video_id", "videoId"], video)
  );
  const isShort = normalizeBoolean(
    extractFirst(["is_short", "isShort"], video)
  );

  return {
    id: String(idSource),
    title: video.title ?? "Untitled video",
    // Some backend records provide `video_id` or `short_id` rather than `slug`.
    // Use those as the slug when available.
    slug:
      (video.slug as string) ??
      (video.video_id as string) ??
      (video.short_id as string) ??
      undefined,
    description: video.description ?? undefined,
    imageUrl,
    duration,
    durationSeconds,
    views,
    comments,
    likes,
    author,
    category,
    // If createdAt is numeric (e.g. `time`), convert seconds -> ISO string.
    createdAt: (() => {
      if (!createdAt) return undefined;
      // createdAt may currently hold a stringified number when coming from `time`.
      const asNumber = Number(createdAt);
      if (!Number.isNaN(asNumber) && asNumber > 1e9) {
        // assume seconds
        try {
          return new Date(asNumber * 1000).toISOString();
        } catch (e) {
          return createdAt;
        }
      }
      return createdAt;
    })(),
    videoLocation,
    videoId,
    isShort,
    raw: video,
  };
}

function extractFirst<T = unknown>(keys: string[], source: RawVideo): T | null {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") {
      return value as T;
    }
  }

  return null;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

const IMAGE_CANDIDATE_KEYS = [
  "thumbnail",
  "thumbnail_url",
  "thumbnailUrl",
  "thumbnail_location",
  "thumbnailLocation",
  "thumbnail_path",
  "thumbnailPath",
  "image",
  "image_url",
  "imageUrl",
  "poster",
  "poster_url",
  "posterUrl",
  "banner",
  "banner_url",
  "bannerUrl",
  "cover",
  "cover_url",
  "coverUrl",
  "featured_image",
  "featuredImage",
  "featured_image_url",
  "featuredImageUrl",
  "preview_image",
  "previewImage",
  "splash_image",
  "splashImage",
];

const IMAGE_OBJECT_VALUE_KEYS = [
  "url",
  "secure_url",
  "secureUrl",
  "src",
  "source",
  "path",
  "uri",
  "image",
  "thumbnail",
  "original",
  "large",
  "medium",
  "small",
];

function getImageUrlFromVideo(video: RawVideo): string | undefined {
  const source = video as Record<string, unknown>;

  for (const key of IMAGE_CANDIDATE_KEYS) {
    const value = source[key];
    const normalized = normalizeImageCandidate(value);
    if (normalized) {
      return normalized;
    }
  }

  const collections = [
    source.images,
    source.media,
    source.thumbnails,
    source.covers,
  ];

  for (const collection of collections) {
    const normalized = normalizeImageCandidate(collection);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function normalizeImageCandidate(
  value: unknown,
  seen?: WeakSet<object>
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    const sanitized = asOptionalString(value);
    return sanitized ? resolveImageUrl(sanitized) : undefined;
  }

  const tracker = seen ?? new WeakSet<object>();

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeImageCandidate(item, tracker);
      if (normalized) {
        return normalized;
      }
    }
    return undefined;
  }

  if (typeof value === "object") {
    if (tracker.has(value as object)) {
      return undefined;
    }
    tracker.add(value as object);

    const record = value as Record<string, unknown>;

    for (const key of IMAGE_OBJECT_VALUE_KEYS) {
      if (key in record) {
        const normalized = normalizeImageCandidate(record[key], tracker);
        if (normalized) {
          return normalized;
        }
      }
    }

    for (const nested of Object.values(record)) {
      const normalized = normalizeImageCandidate(nested, tracker);
      if (normalized) {
        return normalized;
      }
    }
  }

  return undefined;
}

function resolveImageUrl(value: string): string {
  // If it's already an explicit https URL, keep it as-is.
  if (/^https:\/\//i.test(value)) {
    return value;
  }

  // Handle protocol-relative URLs (e.g. //example.com/image.png)
  if (/^\/\//.test(value)) {
    return `https:${value}`;
  }

  // Data URIs and blob URLs should be returned untouched.
  if (/^(data:|blob:)/i.test(value)) {
    return value;
  }

  // If the backend returned a relative path (like "upload/photos/2025/..png")
  // or any value that doesn't start with https://, we will prepend the S3
  // bucket base so the image becomes a full absolute URL.
  const S3_BASE = "https://arewaflix.s3.us-east-005.backblazeb2.com";

  // If it already looks like an absolute http URL but not https (e.g. http://)
  // prefer to convert it to https by replacing the scheme.
  if (/^http:\/\//i.test(value)) {
    return value.replace(/^http:\/\//i, "https://");
  }

  // Otherwise treat it as a relative path and join with the S3 base.
  const cleaned = value.replace(/^\/+/, "");
  return `${S3_BASE}/${cleaned}`;
}

export function formatViewCount(
  count: number | undefined,
  unit: string = "view"
): string {
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) {
    return `0 ${unit}${unit === "view" ? "s" : ""}`;
  }

  if (count < 1000) {
    const suffix = count === 1 && unit === "view" ? "" : "s";
    return `${count} ${unit}${suffix}`;
  }

  const thresholds = [
    { value: 1_000_000_000, suffix: "B" },
    { value: 1_000_000, suffix: "M" },
    { value: 1_000, suffix: "K" },
  ];

  for (const { value, suffix } of thresholds) {
    if (count >= value) {
      const formatted = Math.round((count / value) * 10) / 10;
      const suffixPlural = unit === "view" ? "s" : "";
      return `${formatted}${suffix} ${unit}${suffixPlural}`;
    }
  }

  const suffix = unit === "view" ? "s" : "";
  return `${count} ${unit}${suffix}`;
}

export function formatRelativeDate(dateInput?: string): string | undefined {
  if (!dateInput) {
    return undefined;
  }

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const now = Date.now();
  const diffMs = date.getTime() - now;

  const units: Array<{
    unit: Intl.RelativeTimeFormatUnit;
    ms: number;
  }> = [
    { unit: "year", ms: 1000 * 60 * 60 * 24 * 365 },
    { unit: "month", ms: (1000 * 60 * 60 * 24 * 365) / 12 },
    { unit: "week", ms: 1000 * 60 * 60 * 24 * 7 },
    { unit: "day", ms: 1000 * 60 * 60 * 24 },
    { unit: "hour", ms: 1000 * 60 * 60 },
    { unit: "minute", ms: 1000 * 60 },
  ];

  for (const { unit, ms } of units) {
    const delta = diffMs / ms;
    if (Math.abs(delta) >= 1) {
      if (
        typeof Intl !== "undefined" &&
        typeof Intl.RelativeTimeFormat === "function"
      ) {
        const formatter = new Intl.RelativeTimeFormat(undefined, {
          numeric: "auto",
        });
        return formatter.format(Math.round(delta), unit);
      }

      const count = Math.round(Math.abs(delta));
      const suffix = delta < 0 ? "ago" : "from now";
      return `${count} ${unit}${count === 1 ? "" : "s"} ${suffix}`;
    }
  }

  return "just now";
}

function coerceNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeDuration(
  value: unknown,
  seconds?: number
): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (seconds && Number.isFinite(seconds) && seconds > 0) {
    return secondsToTimestamp(seconds);
  }

  return undefined;
}

function secondsToTimestamp(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds / 60) % 60)
    .toString()
    .padStart(2, "0");
  const hours = Math.floor(totalSeconds / 3600);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes}:${seconds}`;
  }

  return `${minutes}:${seconds}`;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    return value === "1" || value.toLowerCase() === "true";
  }

  return false;
}

function resolveLoopbackHost(urlString: string): string {
  let parsed: URL;

  try {
    parsed = new URL(urlString);
  } catch (error) {
    return urlString;
  }

  if (!isLoopbackHostname(parsed.hostname)) {
    return urlString;
  }

  const derivedHost =
    getDevServerHostname() ??
    (Platform.OS === "android" ? "10.0.2.2" : undefined);

  if (!derivedHost || derivedHost === parsed.hostname) {
    return urlString;
  }

  parsed.hostname = derivedHost;

  const normalized = parsed.toString();
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "0.0.0.0"
  );
}

function getDevServerHostname(): string | null {
  const expoHost =
    (Constants as unknown as { expoConfig?: { hostUri?: string } }).expoConfig
      ?.hostUri ??
    (Constants as unknown as { expoGoConfig?: { hostUri?: string } })
      .expoGoConfig?.hostUri ??
    (
      Constants as unknown as {
        manifest?: { hostUri?: string };
      }
    ).manifest?.hostUri ??
    (
      Constants as unknown as {
        manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
      }
    ).manifest2?.extra?.expoClient?.hostUri ??
    undefined;

  const fromExpo = extractHostname(expoHost);
  if (fromExpo) {
    return fromExpo;
  }

  const sourceCodeModule = (
    NativeModules as {
      SourceCode?: {
        scriptURL?: string;
      };
    }
  ).SourceCode;
  const scriptURL = sourceCodeModule?.scriptURL;
  const fromScript = extractHostname(scriptURL);
  if (fromScript) {
    return fromScript;
  }

  return null;
}

function extractHostname(uri?: string): string | null {
  if (!uri || typeof uri !== "string") {
    return null;
  }

  try {
    const normalised = uri.match(/^https?:\/\//) ? uri : `http://${uri}`;
    const parsed = new URL(normalised);
    return parsed.hostname || null;
  } catch (error) {
    const [host] = uri.split(":");
    return host || null;
  }
}

export function getVideosErrorMessage(error: unknown): string {
  if (
    error instanceof TypeError &&
    typeof error.message === "string" &&
    error.message.toLowerCase().includes("network request failed")
  ) {
    return `Network request failed. Please check your internet connection and try again.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error loading videos.";
}

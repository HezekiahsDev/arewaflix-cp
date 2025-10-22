import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

const DEFAULT_BASE_URL = "https://api.arewaflix.io";

const API_BASE_URL = getSanitizedBaseUrl(
  typeof process !== "undefined" && process.env
    ? process.env.EXPO_PUBLIC_API_BASE_URL
    : undefined
);

/**
 * Comment object returned by the API
 */
export type VideoComment = {
  id: number;
  user_id: number;
  video_id: number;
  post_id: number;
  activity_id: number;
  text: string;
  time: number;
  pinned: string;
  likes: number;
  dis_likes: number;
  username: string;
  avatar: string;
  verified: number;
};

/**
 * Paginated comments response
 */
export type CommentsResponse = {
  data: VideoComment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Like/reaction response
 */
export type LikesResponse = {
  data: {
    videoId: number;
    likes: number;
  };
};

/**
 * Reaction response after posting a like/dislike
 */
export type ReactionResponse = {
  data: {
    videoId: number;
    likes: number;
    dislikes: number;
  };
};

/**
 * User reaction response (0 = none, 1 = like, 2 = dislike)
 */
export type UserReactionResponse = {
  data: {
    videoId: number;
    reaction: 0 | 1 | 2;
  };
};

/**
 * View tracking response
 */
export type ViewResponse = {
  data: {
    videoId: number;
    views: number;
    counted: boolean;
  };
};

/**
 * Fetch comments for a video (no auth required)
 */
export async function fetchVideoComments(
  videoId: string | number,
  options: { page?: number; limit?: number; signal?: AbortSignal } = {}
): Promise<CommentsResponse> {
  const { page = 1, limit = 20, signal } = options;
  const url = `${API_BASE_URL}/api/v1/videos/${videoId}/comments?page=${page}&limit=${limit}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    signal,
  });

  const text = await response.text();

  let payload: any;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (err) {
    // non-json response
    if (!response.ok) {
      throw new Error(
        `Failed to fetch comments: ${response.status} ${response.statusText} - ${text}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch comments: ${response.status} ${response.statusText} - ${JSON.stringify(payload)}`
    );
  }

  return payload as CommentsResponse;
}

/**
 * Post a comment on a video (requires auth)
 */
export async function postVideoComment(
  videoId: string | number,
  commentText: string,
  token: string,
  signal?: AbortSignal
): Promise<CommentsResponse> {
  const url = `${API_BASE_URL}/api/v1/videos/${videoId}/comments`;
  const body = { text: commentText };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  const responseText = await response.text();
  let payload: any;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch (err) {
    if (!response.ok) {
      throw new Error(
        `Failed to post comment: ${response.status} ${response.statusText} - ${responseText}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to post comment: ${response.status} ${response.statusText} - ${JSON.stringify(payload)}`
    );
  }

  return payload as CommentsResponse;
}

/**
 * Fetch likes for a video (no auth required)
 */
export async function fetchVideoLikes(
  videoId: string | number,
  signal?: AbortSignal
): Promise<LikesResponse> {
  const url = `${API_BASE_URL}/api/v1/videos/${videoId}/reactions`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    signal,
  });

  const text = await response.text();

  let payload: any;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (err) {
    if (!response.ok) {
      throw new Error(
        `Failed to fetch likes: ${response.status} ${response.statusText} - ${text}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch likes: ${response.status} ${response.statusText} - ${JSON.stringify(payload)}`
    );
  }

  return payload as LikesResponse;
}

/**
 * Fetch user's reaction for a video (requires auth)
 * Returns 0 = none, 1 = like, 2 = dislike
 */
export async function fetchUserReaction(
  videoId: string | number,
  token: string,
  signal?: AbortSignal
): Promise<UserReactionResponse> {
  const url = `${API_BASE_URL}/api/v1/videos/${videoId}/reaction`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  const text = await response.text();
  let payload: any;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (err) {
    if (!response.ok) {
      throw new Error(
        `Failed to fetch user reaction: ${response.status} ${response.statusText} - ${text}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch user reaction: ${response.status} ${response.statusText} - ${JSON.stringify(payload)}`
    );
  }

  return payload as UserReactionResponse;
}

/**
 * Post a reaction (like/dislike) on a video (requires auth)
 */
export async function postVideoReaction(
  videoId: string | number,
  action: "like" | "dislike",
  token: string,
  signal?: AbortSignal
): Promise<ReactionResponse> {
  const url = `${API_BASE_URL}/api/v1/videos/reactions`;
  const body = { video_id: Number(videoId), action };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  const text = await response.text();
  let payload: any;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (err) {
    if (!response.ok) {
      throw new Error(
        `Failed to post reaction: ${response.status} ${response.statusText} - ${text}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to post reaction: ${response.status} ${response.statusText} - ${JSON.stringify(payload)}`
    );
  }

  return payload as ReactionResponse;
}

/**
 * Track a view on a video (no auth required, but optionally includes user_id)
 */
export async function trackVideoView(
  videoId: string | number,
  options: {
    fingerprint: string;
    userId?: number;
    signal?: AbortSignal;
  }
): Promise<ViewResponse> {
  const { fingerprint, userId, signal } = options;
  const url = `${API_BASE_URL}/api/v1/videos/views`;
  const body = {
    video_id: Number(videoId),
    fingerprint,
    ...(userId ? { user_id: userId } : {}),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  const text = await response.text();
  let payload: any;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (err) {
    if (!response.ok) {
      throw new Error(
        `Failed to track view: ${response.status} ${response.statusText} - ${text}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to track view: ${response.status} ${response.statusText} - ${JSON.stringify(payload)}`
    );
  }

  return payload as ViewResponse;
}

function getSanitizedBaseUrl(value?: string): string {
  const base = (value && value.trim()) || DEFAULT_BASE_URL;
  const trimmed = base.replace(/\/$/, "");
  return resolveLoopbackHost(trimmed);
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

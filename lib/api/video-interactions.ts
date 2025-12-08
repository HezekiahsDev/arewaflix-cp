import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

const DEFAULT_BASE_URL = "https://api.arewaflix.io";

const API_BASE_URL = getSanitizedBaseUrl(
  typeof process !== "undefined" && process.env
    ? process.env.EXPO_PUBLIC_API_BASE_URL
    : undefined
);

export class ApiError extends Error {
  status: number;
  payload: any;

  constructor(status: number, message: string, payload?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

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
 * Comment reaction response
 */
export type CommentReactionResponse = {
  data: {
    commentId: number;
    likes: number;
    dislikes: number;
  };
};

/**
 * Fetch the authenticated user's reaction for a specific comment
 * Returns payload shape like: { data: { reaction: "like" | "null" } }
 */
export type CommentUserReactionResponse = {
  data: {
    reaction: string | null;
  };
};

export async function fetchCommentReaction(
  videoId: string | number,
  commentId: string | number,
  token: string,
  signal?: AbortSignal
): Promise<CommentUserReactionResponse> {
  const url = `${API_BASE_URL}/api/v1/videos/${videoId}/comments/${commentId}/reaction`;

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
        `Failed to fetch comment reaction: ${response.status} ${response.statusText} - ${text}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch comment reaction: ${response.status} ${response.statusText} - ${JSON.stringify(
        payload
      )}`
    );
  }

  return payload as CommentUserReactionResponse;
}

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
  options: {
    page?: number;
    limit?: number;
    signal?: AbortSignal;
    token?: string;
  } = {}
): Promise<CommentsResponse> {
  const { page = 1, limit = 20, signal, token } = options;
  const url = `${API_BASE_URL}/api/v1/videos/${videoId}/comments?page=${page}&limit=${limit}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Request logging removed for production.

  const response = await fetch(url, {
    method: "GET",
    headers,
    signal,
  });

  const text = await response.text();

  // Response logging removed for production.

  let payload: any;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (err) {
    // non-json response
    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Failed to fetch comments: ${response.status} ${response.statusText}`,
        text
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `Failed to fetch comments: ${response.status} ${response.statusText}`,
      payload
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
 * Save a video for the authenticated user
 */
export async function saveVideo(
  videoId: string | number,
  token: string,
  signal?: AbortSignal
): Promise<any> {
  const url = `${API_BASE_URL}/api/v1/videos/${videoId}/save`;

  const response = await fetch(url, {
    method: "POST",
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
        `Failed to save video: ${response.status} ${response.statusText} - ${text}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to save video: ${response.status} ${response.statusText} - ${JSON.stringify(
        payload
      )}`
    );
  }

  return payload;
}

/**
 * Un-save a previously saved video for the authenticated user
 */
export async function unsaveVideo(
  videoId: string | number,
  token: string,
  signal?: AbortSignal
): Promise<any> {
  const url = `${API_BASE_URL}/api/v1/videos/${videoId}/save`;

  const response = await fetch(url, {
    method: "DELETE",
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
        `Failed to unsave video: ${response.status} ${response.statusText} - ${text}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to unsave video: ${response.status} ${response.statusText} - ${JSON.stringify(
        payload
      )}`
    );
  }

  return payload;
}

/**
 * Fetch whether the authenticated user has saved a video
 */
export async function fetchVideoSaved(
  videoId: string | number,
  token: string,
  signal?: AbortSignal
): Promise<boolean> {
  const url = `${API_BASE_URL}/api/v1/videos/${videoId}/save`;

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
        `Failed to fetch saved state: ${response.status} ${response.statusText} - ${text}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch saved state: ${response.status} ${response.statusText} - ${JSON.stringify(
        payload
      )}`
    );
  }

  const savedFlag = payload?.data?.saved ?? payload?.saved ?? payload?.is_saved;
  return Boolean(savedFlag === 1 || savedFlag === true);
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

/**
 * Post a reaction (like/dislike/remove) on a comment (requires auth)
 */
export async function postCommentReaction(
  videoId: string | number,
  commentId: string | number,
  action: "like" | "dislike" | "remove",
  token: string,
  signal?: AbortSignal
): Promise<CommentReactionResponse> {
  const url = `${API_BASE_URL}/api/v1/videos/${videoId}/comments/${commentId}/reactions`;
  const body = { action };

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
        `Failed to post comment reaction: ${response.status} ${response.statusText} - ${text}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to post comment reaction: ${response.status} ${response.statusText} - ${JSON.stringify(payload)}`
    );
  }

  return payload as CommentReactionResponse;
}

/**
 * Submit a report for a video
 */
export async function submitVideoReport(
  videoId: string | number,
  text: string,
  category?: string,
  token?: string,
  signal?: AbortSignal
): Promise<any> {
  const url = `${API_BASE_URL}/api/v1/videos/${videoId}/report`;
  // API expects only the `text` field in the request body. Do not include
  // additional fields like `category` as they cause a 400 response.
  const body: any = { text };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  const textResp = await response.text();
  let payload: any;
  try {
    payload = textResp ? JSON.parse(textResp) : null;
  } catch (err) {
    if (!response.ok) {
      throw new Error(
        `Failed to submit video report: ${response.status} ${response.statusText} - ${textResp}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to submit video report: ${response.status} ${response.statusText} - ${JSON.stringify(payload)}`
    );
  }

  return payload;
}

/**
 * Submit a report for a comment
 */
export async function submitCommentReport(
  videoId: string | number,
  commentId: string | number,
  text: string,
  category?: string,
  token?: string,
  signal?: AbortSignal
): Promise<any> {
  // Endpoint uses nested video -> comment path
  const url = `${API_BASE_URL}/api/v1/videos/${videoId}/comments/${commentId}/report`;
  // API expects only the `text` field in the request body. Do not include
  // additional fields like `category` as they cause a 400 response.
  const body: any = { text };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  const textResp = await response.text();
  let payload: any;
  try {
    payload = textResp ? JSON.parse(textResp) : null;
  } catch (err) {
    if (!response.ok) {
      throw new Error(
        `Failed to submit comment report: ${response.status} ${response.statusText} - ${textResp}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to submit comment report: ${response.status} ${response.statusText} - ${JSON.stringify(payload)}`
    );
  }

  return payload;
}

/**
 * Fetch a single comment by ID
 */
export async function fetchSingleComment(
  videoId: string | number,
  commentId: string | number,
  token?: string,
  signal?: AbortSignal
): Promise<VideoComment> {
  const url = `${API_BASE_URL}/api/v1/videos/${videoId}/comments/${commentId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
        `Failed to fetch comment: ${response.status} ${response.statusText} - ${text}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch comment: ${response.status} ${response.statusText} - ${JSON.stringify(payload)}`
    );
  }

  return payload as VideoComment;
}

/**
 * Block a user
 */
export async function blockUser(
  userId: string | number,
  token: string,
  signal?: AbortSignal
): Promise<any> {
  const url = `${API_BASE_URL}/api/v1/user-block/block/${userId}`;

  const response = await fetch(url, {
    method: "POST",
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
        `Failed to block user: ${response.status} ${response.statusText} - ${text}`
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to block user: ${response.status} ${response.statusText} - ${JSON.stringify(payload)}`
    );
  }

  return payload;
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

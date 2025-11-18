import { API_BASE_URL } from "./auth";

export type Notification = {
  id: number;
  notifierId: number;
  recipientId: number;
  videoId: number;
  type: string;
  text: string;
  url: string;
  seen: boolean;
  time: number; // unix timestamp in seconds
  sentPush: boolean;
  fullLink: string;
};

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  message?: string;
}

export async function getNotifications(
  token: string
): Promise<NotificationsResponse> {
  const url = `${API_BASE_URL}/api/v1/users/me/notifications`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    let result: any = null;
    try {
      result = text ? JSON.parse(text) : null;
    } catch (e) {
      result = text;
    }

    if (!response.ok) {
      if (result && typeof result === "object" && "success" in result) {
        return {
          success: false,
          data: [],
          message: result.message || "Request failed",
        } as NotificationsResponse;
      }
      throw new Error(
        (result && result.message) ||
          text ||
          `Request failed: ${response.status}`
      );
    }

    if (result && typeof result === "object") {
      return result as NotificationsResponse;
    }

    return {
      success: true,
      data: [],
      message: String(text || ""),
    } as NotificationsResponse;
  } catch (error) {
    console.error("❌ Notifications Network Error:", error);
    throw new Error(`Fetching notifications failed: ${String(error)}`);
  }
}

export type NotificationIdLike = number | string;

export interface MarkSeenPayload {
  // seen_time is optional
  seen_time?: number; // unix timestamp in seconds
  // notification_ids can be a single number/string or an array of numbers/strings
  notification_ids: NotificationIdLike | NotificationIdLike[];
}

export interface MarkSeenResponse {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * Mark notifications seen for given notification ids. Backend expects POST to the
 * same endpoint: /api/v1/users/me/notifications with payload { seen_time, notification_ids }
 */
export async function markNotificationsSeen(
  token: string,
  payload: MarkSeenPayload
): Promise<MarkSeenResponse> {
  const url = `${API_BASE_URL}/api/v1/users/me/notifications`;

  // Basic validation: notification_ids must be provided and be number/string or array
  const validNotificationIds = (() => {
    const ids = payload.notification_ids;
    if (ids === null || ids === undefined) return false;
    if (Array.isArray(ids)) {
      return ids.every((v) => typeof v === "number" || typeof v === "string");
    }
    return typeof ids === "number" || typeof ids === "string";
  })();

  if (!validNotificationIds) {
    throw new Error(
      "Invalid payload: notification_ids is required and must be a number, string, or array of numbers/strings"
    );
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let result: any = null;
    try {
      result = text ? JSON.parse(text) : null;
    } catch (e) {
      result = text;
    }

    if (!response.ok) {
      if (result && typeof result === "object" && "success" in result) {
        return {
          success: false,
          message: result.message || "Request failed",
          data: result.data,
        } as MarkSeenResponse;
      }
      throw new Error(
        (result && result.message) ||
          text ||
          `Request failed: ${response.status}`
      );
    }

    if (result && typeof result === "object") {
      return result as MarkSeenResponse;
    }

    return {
      success: true,
      data: result,
      message: String(text || ""),
    } as MarkSeenResponse;
  } catch (error) {
    console.error("❌ Mark Seen Network Error:", error);
    throw new Error(`Mark seen failed: ${String(error)}`);
  }
}

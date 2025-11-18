import Colors from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
  getNotifications,
  markNotificationsSeen,
  Notification,
} from "@/lib/api/notifications";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  colorScheme: "light" | "dark" | string;
};

export default function NotificationsModal({
  visible,
  onClose,
  colorScheme,
}: Props) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchNotifications() {
      if (!visible) return;
      if (!token) {
        setNotifications([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await getNotifications(token);
        if (mounted) {
          if (res && res.success) {
            const data = res.data || [];
            setNotifications(data);

            // For ease: send POST for every notification that has seen === false.
            // Build list of notification ids to send in payload.
            const unseen = data.filter((n) => !n.seen);
            const notificationIds = unseen.map((n) => n.id);

            if (notificationIds.length > 0) {
              try {
                const payload = {
                  seen_time: Math.floor(Date.now() / 1000),
                  notification_ids: notificationIds,
                };
                const resp = await markNotificationsSeen(token, payload);

                // Optimistically mark notifications as seen locally
                setNotifications((prev) =>
                  prev.map((it) => ({ ...it, seen: true }))
                );
              } catch (e) {
                console.warn("Failed to mark notifications seen", e);
              }
            }
          } else {
            setError(res?.message || "Failed to load notifications");
          }
        }
      } catch (err) {
        setError(String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchNotifications();

    return () => {
      mounted = false;
    };
  }, [visible, token]);

  async function markAllAsRead() {
    if (!token) return;
    const unseen = notifications.filter((n) => !n.seen);
    if (!unseen.length) return;
    const notificationIds = unseen.map((n) => n.id);
    const payload = {
      seen_time: Math.floor(Date.now() / 1000),
      notification_ids: notificationIds,
    };
    try {
      setIsMarking(true);
      const resp = await markNotificationsSeen(token, payload);
      setNotifications((prev) => prev.map((it) => ({ ...it, seen: true })));
    } catch (e) {
      console.warn("Failed to mark all notifications seen", e);
    } finally {
      setIsMarking(false);
    }
  }

  async function markSingleAsRead(item: Notification) {
    if (!token) return;
    const payload = {
      seen_time: Math.floor(Date.now() / 1000),
      notification_ids: [item.id],
    };
    try {
      const resp = await markNotificationsSeen(token, payload);
      setNotifications((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, seen: true } : it))
      );
    } catch (e) {
      console.warn("Failed to mark notification seen", e);
    }
  }

  const palette = Colors[colorScheme as "light" | "dark"] || Colors.light;

  function openNotification(item: Notification) {
    try {
      if (item.fullLink) {
        // external absolute link
        Linking.openURL(item.fullLink);
        return;
      }

      if (item.url) {
        // internal app route - push as any to avoid strict path union typing
        (router as any).push(item.url);
        return;
      }

      // fallback: do nothing
    } catch (e) {
      console.warn("Failed to open notification link", e);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.bottom + 60}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, backgroundColor: palette.surface || "#fff" }}>
          <View className="flex-row items-center justify-between p-4 border-b border-border dark:border-border-dark">
            <Text
              className="text-lg font-semibold"
              style={{ color: palette.text }}
            >
              Notifications
            </Text>
            <View className="flex-row items-center">
              {notifications.some((n) => !n.seen) ? (
                <Pressable
                  onPress={markAllAsRead}
                  disabled={isMarking}
                  className="px-3 py-1 mr-3 rounded-full bg-surface-muted dark:bg-surface-muted-dark"
                >
                  <Text style={{ color: palette.text }}>
                    {isMarking ? "Marking..." : "Mark all read"}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} className="p-2">
                <Text style={{ color: palette.textMuted }}>Close</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            {loading ? (
              <View className="items-center justify-center py-6">
                <ActivityIndicator size="small" color={palette.primary} />
              </View>
            ) : error ? (
              <View className="px-4 py-4">
                <Text style={{ color: palette.textMuted }}>{error}</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View className="px-4 py-4">
                <Text style={{ color: palette.textMuted }}>
                  No notifications
                </Text>
              </View>
            ) : (
              <FlatList
                data={showAll ? notifications : notifications.slice(0, 5)}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => openNotification(item)}
                    className="px-4 py-3 border-b border-border dark:border-border-dark"
                  >
                    <View className="flex-row items-start justify-between">
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: palette.text }}>{item.text}</Text>
                        <Text
                          style={{ color: palette.textMuted, fontSize: 12 }}
                        >
                          {new Date(item.time * 1000).toLocaleString()}
                        </Text>
                      </View>
                      {!item.seen ? (
                        <View className="flex-row items-center ml-3">
                          <View className="w-3 h-3 bg-red-500 rounded-full" />
                          <Pressable
                            onPress={() => markSingleAsRead(item)}
                            className="px-2 py-1 ml-3 rounded-full bg-surface-muted dark:bg-surface-muted-dark"
                          >
                            <Text style={{ color: palette.text, fontSize: 12 }}>
                              Mark
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                )}
                ListFooterComponent={() =>
                  !showAll && notifications.length > 5 ? (
                    <View className="items-center p-4">
                      <Pressable
                        onPress={() => setShowAll(true)}
                        className="px-4 py-2 rounded-full bg-surface-muted dark:bg-surface-muted-dark"
                      >
                        <Text style={{ color: palette.text }}>Show all</Text>
                      </Pressable>
                    </View>
                  ) : null
                }
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

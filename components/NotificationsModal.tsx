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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 24,
              paddingTop: insets.top,
              paddingBottom: 16,
              backgroundColor: palette.surface,
            }}
          >
            <Text
              style={{
                color: palette.text,
                fontSize: 24,
                fontWeight: "700",
                letterSpacing: 0.5,
              }}
            >
              Notifications
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {notifications.some((n) => !n.seen) ? (
                <Pressable
                  onPress={markAllAsRead}
                  disabled={isMarking}
                  style={{
                    marginRight: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: palette.surfaceMuted,
                    opacity: isMarking ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: palette.text, fontSize: 14 }}>
                    {isMarking ? "..." : "Mark all"}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={onClose}
                style={{
                  padding: 8,
                  borderRadius: 999,
                  backgroundColor: palette.surfaceMuted,
                }}
                accessibilityLabel="Close notifications"
              >
                <Text style={{ color: palette.textMuted, fontSize: 16 }}>
                  ✕
                </Text>
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
                contentContainerStyle={{
                  paddingBottom: 40,
                  paddingHorizontal: 16,
                }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => openNotification(item)}
                    style={{
                      marginBottom: 16,
                      borderRadius: 16,
                      backgroundColor: item.seen
                        ? palette.surfaceMuted
                        : palette.surface,
                      shadowColor: palette.shadow || "#000",
                      shadowOpacity: 0.08,
                      shadowRadius: 8,
                      elevation: 2,
                      padding: 18,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: palette.text,
                          fontSize: 16,
                          fontWeight: item.seen ? "400" : "600",
                        }}
                      >
                        {item.text}
                      </Text>
                      <Text
                        style={{
                          color: palette.textMuted,
                          fontSize: 12,
                          marginTop: 6,
                        }}
                      >
                        {new Date(item.time * 1000).toLocaleString()}
                      </Text>
                    </View>
                    {!item.seen ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginLeft: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            backgroundColor: "#ef4444",
                            borderRadius: 4,
                            marginRight: 8,
                          }}
                        />
                        <Pressable
                          onPress={() => markSingleAsRead(item)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: palette.surfaceMuted,
                          }}
                        >
                          <Text style={{ color: palette.text, fontSize: 12 }}>
                            ✓
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </Pressable>
                )}
                ListFooterComponent={() =>
                  !showAll && notifications.length > 5 ? (
                    <View style={{ alignItems: "center", padding: 16 }}>
                      <Pressable
                        onPress={() => setShowAll(true)}
                        style={{
                          paddingHorizontal: 24,
                          paddingVertical: 10,
                          borderRadius: 999,
                          backgroundColor: palette.surfaceMuted,
                        }}
                      >
                        <Text style={{ color: palette.text, fontSize: 15 }}>
                          Show all
                        </Text>
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

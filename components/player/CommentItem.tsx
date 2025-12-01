import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

interface CommentItemProps {
  comment: {
    id: string | number;
    username: string;
    avatar?: string;
    text: string;
    time: number;
    likes?: number;
    verified?: number;
  };
  isLiked: boolean;
  onLikePress: (commentId: string | number) => void;
  onReportPress: (commentId: string) => void;
  disabled?: boolean;
  resolveAvatarUri: (avatar?: string) => string | undefined;
  styles: {
    commentBubble: any;
    commentHeader: any;
    commentAvatar: any;
    commentHeaderInfo: any;
    commentUserRow: any;
    commentUsername: any;
    verifiedBadge?: any;
    commentTime: any;
    commentText: any;
  };
}

export default function CommentItem({
  comment,
  isLiked,
  onLikePress,
  onReportPress,
  disabled = false,
  resolveAvatarUri,
  styles,
}: CommentItemProps) {
  const avatarUri = resolveAvatarUri(comment.avatar);

  return (
    <View style={styles.commentBubble}>
      <View style={[styles.commentHeader, { justifyContent: "space-between" }]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Image
            source={{
              uri: avatarUri || "https://via.placeholder.com/32",
            }}
            style={styles.commentAvatar}
          />
          <View style={styles.commentHeaderInfo}>
            <View style={styles.commentUserRow}>
              <Text style={styles.commentUsername}>{comment.username}</Text>
              {comment.verified === 1 && (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color="#38bdf8"
                  style={styles.verifiedBadge}
                />
              )}
            </View>
            <Text style={styles.commentTime}>
              {new Date(comment.time * 1000).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.commentText}>{comment.text}</Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 8,
          gap: 16,
        }}
      >
        <Pressable
          onPress={() => onLikePress(comment.id)}
          disabled={disabled}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 6,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={16}
            color={isLiked ? "#ff2d55" : "rgba(255,255,255,0.7)"}
          />
          <Text
            style={{
              color: isLiked ? "#ff2d55" : "rgba(255,255,255,0.7)",
              fontSize: 12,
              marginLeft: 6,
              fontWeight: "500",
            }}
          >
            {comment.likes ?? 0}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onReportPress(String(comment.id))}
          disabled={disabled}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 6,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Ionicons name="flag-outline" size={16} color="#ff3b30" />
        </Pressable>
      </View>
    </View>
  );
}

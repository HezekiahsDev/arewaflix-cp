import { blockCreator, blockVideo } from "@/lib/api/video-interactions";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  videoId?: string | null;
  creatorId?: string | null;
  token?: string | null;
  onSuccess?: () => void;
};

const blockOptions = [
  { id: "not-interested", label: "Not interested" },
  { id: "spam", label: "Spam or misleading" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "hate", label: "Hate speech" },
  { id: "violence", label: "Violence or dangerous acts" },
  { id: "sexual", label: "Sexual content" },
  { id: "other", label: "Other (please specify)" },
];

export default function BlockContentModal({
  visible,
  onClose,
  videoId,
  creatorId,
  token,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockCreatorChecked, setBlockCreatorChecked] = useState(false);

  const handleCancel = () => {
    if (isSubmitting) return;
    setSelectedOption(null);
    setReason("");
    setError(null);
    setBlockCreatorChecked(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedOption || !reason.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (videoId && token) {
        // Debug log: submission start
        console.debug("BlockContentModal: submitting block", {
          videoId,
          creatorId,
          reason: reason.trim(),
          blockCreatorChecked,
          tokenPresent: !!token,
        });

        // Block the video
        const videoResp = await blockVideo(videoId, reason.trim(), token);
        console.debug("BlockContentModal: blockVideo response", { videoResp });

        // If block creator is checked, also block the creator
        if (blockCreatorChecked && creatorId) {
          const creatorResp = await blockCreator(
            creatorId,
            reason.trim(),
            token
          );
          console.debug("BlockContentModal: blockCreator response", {
            creatorResp,
          });
        }

        setSelectedOption(null);
        setReason("");
        setBlockCreatorChecked(false);
        setIsSubmitting(false);
        onClose();

        const creatorBlocked = blockCreatorChecked && creatorId;
        Alert.alert(
          creatorBlocked ? "Content and creator blocked" : "Content blocked",
          creatorBlocked
            ? "This video and all videos from this creator have been blocked. You won't see them anymore."
            : "This video has been blocked. You won't see it anymore."
        );

        if (onSuccess) onSuccess();
      } else {
        throw new Error("No target for blocking");
      }
    } catch (err) {
      console.warn("BlockContentModal: Block submission failed:", err);
      console.error("BlockContentModal: Error details:", {
        error: err,
        message: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined,
        state: {
          selectedOption,
          reason: reason.trim(),
          blockCreatorChecked,
          videoId,
          creatorId,
          token: token ? "present" : "missing",
        },
      });
      setError("Failed to block content. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Block Content</Text>
            <Pressable onPress={handleCancel} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <Text style={styles.description}>
            Why do you want to block this content?
          </Text>

          {!token ? (
            <View style={styles.loginPromptContainer}>
              <Text style={styles.loginPromptText}>
                Please sign in to block content.
              </Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                <Pressable
                  onPress={() => {
                    // close modal then navigate to login
                    onClose();
                    try {
                      router.push("/auth/login");
                    } catch (e) {
                      // fallback: do nothing
                    }
                  }}
                  style={styles.loginButton}
                >
                  <Text style={styles.loginButtonText}>Sign In</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {blockOptions.map((option) => {
            const selected = selectedOption === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  setSelectedOption(option.id);
                  if (option.id !== "other") setReason(option.label);
                  else setReason("");
                }}
                style={[styles.option, selected ? styles.optionSelected : null]}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected ? styles.optionTextSelected : null,
                  ]}
                >
                  {option.label}
                </Text>
                {selected && (
                  <Ionicons name="checkmark-circle" size={20} color="#ff3b30" />
                )}
              </Pressable>
            );
          })}

          {selectedOption === "other" && (
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Please specify..."
              placeholderTextColor="#666"
              style={styles.textArea}
              multiline
              numberOfLines={3}
            />
          )}

          <Pressable
            onPress={() => setBlockCreatorChecked(!blockCreatorChecked)}
            style={styles.checkboxContainer}
          >
            <View style={styles.checkbox}>
              {blockCreatorChecked && (
                <Ionicons name="checkmark" size={16} color="#ff3b30" />
              )}
            </View>
            <View style={styles.checkboxTextContainer}>
              <Text style={styles.checkboxText}>
                Block all videos from this creator
              </Text>
              <Text style={styles.checkboxSubtext}>
                You will no longer see any content from this creator
              </Text>
            </View>
          </Pressable>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleCancel}
              style={styles.cancelButton}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              style={[
                styles.blockButton,
                !selectedOption || !reason.trim() || isSubmitting
                  ? styles.blockButtonDisabled
                  : null,
              ]}
              disabled={!selectedOption || !reason.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.blockButtonText}>Block</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "600" },
  description: { color: "#ccc", fontSize: 14, marginBottom: 12 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  optionSelected: {
    backgroundColor: "rgba(255, 59, 48, 0.08)",
    borderWidth: 1,
    borderColor: "#ff3b30",
  },
  optionText: { color: "#fff", fontSize: 14 },
  optionTextSelected: { color: "#ff6b6b" },
  textArea: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.03)",
    marginTop: 12,
    minHeight: 80,
    textAlignVertical: "top",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#666",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  checkboxSubtext: { color: "#ccc", fontSize: 12, marginTop: 2 },
  errorText: { color: "#ff6b6b", fontSize: 14, marginTop: 8 },
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  cancelText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  blockButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#ff3b30",
    alignItems: "center",
  },
  blockButtonDisabled: { backgroundColor: "rgba(255,59,48,0.35)" },
  blockButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  loginPromptContainer: {
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  loginPromptText: { color: "#ddd", fontSize: 14 },
  loginButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#ff3b30",
  },
  loginButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

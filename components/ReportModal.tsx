import {
  submitCommentReport,
  submitVideoReport,
} from "@/lib/api/video-interactions";
import { Ionicons } from "@expo/vector-icons";
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
  commentId?: string | null;
  token?: string | null;
  onSuccess?: (isComment: boolean) => void;
};

const options = [
  { id: "spam", label: "Spam or misleading" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "hate", label: "Hate speech" },
  { id: "violence", label: "Violence or dangerous acts" },
  { id: "sexual", label: "Sexual content" },
  { id: "copyright", label: "Copyright infringement" },
  { id: "other", label: "Other (please specify)" },
];

export default function ReportModal({
  visible,
  onClose,
  videoId,
  commentId,
  token,
  onSuccess,
}: Props) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    if (isSubmitting) return;
    setSelectedOption(null);
    setReason("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedOption || !reason.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (commentId && videoId) {
        await submitCommentReport(
          videoId,
          commentId,
          reason.trim(),
          selectedOption,
          token ?? undefined
        );
      } else if (videoId) {
        await submitVideoReport(
          videoId,
          reason.trim(),
          selectedOption,
          token ?? undefined
        );
      } else {
        throw new Error("No target for report");
      }

      setSelectedOption(null);
      setReason("");
      setIsSubmitting(false);
      onClose();

      const isComment = Boolean(commentId);
      Alert.alert(
        isComment ? "Comment reported" : "Report submitted",
        isComment
          ? "Report submitted for comment. Thank you for helping keep our community safe."
          : "Report submitted. Thank you for helping keep our community safe."
      );

      if (onSuccess) onSuccess(Boolean(commentId));
    } catch (err) {
      console.warn("Report submission failed:", err);
      setError("Failed to submit report. Please try again.");
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
            <Text style={styles.title}>Report Content</Text>
            <Pressable onPress={handleCancel} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <Text style={styles.description}>
            Why are you reporting this content?
          </Text>

          {options.map((option) => {
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
                styles.reportButton,
                !selectedOption || !reason.trim() || isSubmitting
                  ? styles.reportButtonDisabled
                  : null,
              ]}
              disabled={!selectedOption || !reason.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.reportButtonText}>Report</Text>
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
  reportButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#ff3b30",
    alignItems: "center",
  },
  reportButtonDisabled: { backgroundColor: "rgba(255,59,48,0.35)" },
  reportButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

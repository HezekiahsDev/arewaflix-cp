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
  token?: string | null;
  onSuccess?: () => void;
};

const OPTIONS = [
  { id: "spam", label: "Spam or misleading" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "inappropriate", label: "Inappropriate or offensive content" },
  { id: "other", label: "Other (please specify)" },
];

export default function BlockCreatorModal({
  visible,
  onClose,
  videoId,
  token,
  onSuccess,
}: Props) {
  const router = useRouter();
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
    if (!selectedOption) return;
    if (selectedOption === "other" && !reason.trim()) return;
    if (!videoId) {
      setError("Missing video ID.");
      return;
    }
    if (!token) {
      onClose();
      try {
        router.push("/auth/login");
      } catch (e) {}
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = `https://api.arewaflix.io/api/v1/block-creator/block/${encodeURIComponent(
        videoId
      )}`;

      const payload = {
        reason: selectedOption,
        note: reason.trim() || undefined,
      } as any;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.warn("block-creator failed:", resp.status, text);
        setError("Failed to block creator. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSelectedOption(null);
      setReason("");
      setIsSubmitting(false);
      onClose();
      Alert.alert("Creator blocked", "The creator has been blocked.");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.warn("BlockCreatorModal: error", err);
      setError("Failed to block creator. Please try again.");
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
            <Text style={styles.title}>Block Creator</Text>
            <Pressable onPress={handleCancel} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          {!token ? (
            <View style={styles.loginPromptContainer}>
              <Text style={styles.loginPromptText}>
                Please sign in to block creators.
              </Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                <Pressable
                  onPress={() => {
                    onClose();
                    try {
                      router.push("/auth/login");
                    } catch (e) {}
                  }}
                  style={styles.loginButton}
                >
                  <Text style={styles.loginButtonText}>Sign In</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {OPTIONS.map((option) => {
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
              style={styles.submitButton}
              disabled={isSubmitting || !selectedOption}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitText}>Block</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: {
    width: "92%",
    maxWidth: 520,
    backgroundColor: "#0b0b0b",
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  loginPromptContainer: { marginVertical: 12 },
  loginPromptText: { color: "rgba(255,255,255,0.85)" },
  loginButton: {
    backgroundColor: "#38bdf8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loginButtonText: { color: "#000", fontWeight: "700" },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  optionSelected: { backgroundColor: "rgba(255,255,255,0.06)" },
  optionText: { color: "#fff" },
  optionTextSelected: { color: "#fff", fontWeight: "700" },
  textArea: {
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "#fff",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  errorText: { color: "#f87171", marginTop: 8 },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cancelText: { color: "#fff" },
  submitButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#ff3b30",
  },
  submitText: { color: "#fff", fontWeight: "700" },
});

import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  privacyUrl?: string | null;
};

export default function TrackingPermissionPrompt({
  visible,
  onAccept,
  onDecline,
  privacyUrl,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>Allow tracking?</Text>
          <Text style={styles.body}>
            We use a device identifier to prevent fraud and improve
            recommendations. This identifier is never sold. Allow tracking
            improves recommendations across devices.
          </Text>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={onDecline}
              style={[styles.button, styles.ghost]}
            >
              <Text style={styles.ghostText}>Not now</Text>
            </Pressable>

            <Pressable
              onPress={onAccept}
              style={[styles.button, styles.primary]}
            >
              <Text style={styles.primaryText}>Allow</Text>
            </Pressable>
          </View>
          {privacyUrl ? (
            <Text
              style={[styles.note, { color: "#0ea5e9" }]}
              onPress={() => WebBrowser.openBrowserAsync(privacyUrl)}
            >
              View our Privacy Policy
            </Text>
          ) : (
            <Text style={styles.note}>
              You can change this later in your device settings.{" "}
              {Platform.OS === "ios" ? "(iOS App Tracking Transparency)" : ""}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, color: "#333", marginBottom: 16 },
  actionsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  primary: { backgroundColor: "#0ea5e9" },
  primaryText: { color: "#fff", fontWeight: "700" },
  ghost: { backgroundColor: "transparent" },
  ghostText: { color: "#0f172a", fontWeight: "600" },
  note: { marginTop: 12, fontSize: 12, color: "#666" },
});

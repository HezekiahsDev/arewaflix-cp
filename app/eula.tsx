import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EulaPage() {
  const router = useRouter();
  const privacyUrl = (Constants as any)?.expoConfig?.extra?.privacyPolicyUrl;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Terms of Use</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 20 }}
      >
        <Text style={styles.title}>Welcome to Arewaflix — Terms of Use</Text>

        <Text style={styles.p}>
          These Terms of Use describe the rules for using Arewaflix. By creating
          an account or using our services you agree to these terms.
        </Text>

        <Text style={styles.subtitle}>1. Community Standards</Text>
        <Text style={styles.p}>
          Arewaflix has no tolerance for objectionable content. You must not
          upload, post, or transmit content that includes harassment, hate
          speech, threats, explicit sexual material, or otherwise unlawful or
          harmful material. Content that violates these standards may be removed
          immediately and accounts may be suspended or terminated.
        </Text>

        <Text style={styles.subtitle}>2. Reporting and Moderation</Text>
        <Text style={styles.p}>
          Users may report objectionable content using the in-app reporting
          tools. Reported content is reviewed by our moderation team and may be
          removed or action taken against the account based on severity. We also
          use automated tools to detect and filter abusive content.
        </Text>

        <Text style={styles.subtitle}>3. Blocking and Safety</Text>
        <Text style={styles.p}>
          You can block other users to prevent seeing their comments or content.
          Blocking is immediate on your device and may be enforced server-side
          when logged in.
        </Text>

        <Text style={styles.subtitle}>4. Appeals and Contact</Text>
        <Text style={styles.p}>
          If you believe your content was removed in error, contact our support
          team via the Help & Support page. We provide an appeals process for
          adverse moderation actions.
        </Text>

        <Text style={styles.subtitle}>5. Privacy</Text>
        <Text style={styles.p}>
          Our Privacy Policy describes how we collect and use data. See the
          Privacy Policy for details.
        </Text>

        {privacyUrl ? (
          <Pressable
            onPress={() => {
              // open in external browser
              import("expo-web-browser").then((wb) =>
                wb.openBrowserAsync(privacyUrl)
              );
            }}
            style={styles.link}
          >
            <Text style={styles.linkText}>Open Privacy Policy</Text>
          </Pressable>
        ) : null}

        <View style={{ height: 64 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  closeBtn: { padding: 8 },
  closeText: { color: "#0ea5e9", fontWeight: "700" },
  container: { flex: 1 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  subtitle: { fontSize: 16, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  p: { fontSize: 14, color: "#333", lineHeight: 20 },
  link: { marginTop: 12 },
  linkText: { color: "#0ea5e9", fontWeight: "700" },
});

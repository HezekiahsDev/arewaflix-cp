import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
} from "react-native";

export type OptionItem = {
  key: string;
  label: string;
  icon?: string;
  destructive?: boolean;
  onPress: () => void;
};

export default function OptionsMenu({
  visible,
  onClose,
  items,
}: {
  visible: boolean;
  onClose: () => void;
  items: OptionItem[];
}) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: visible ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: visible ? 0 : 12,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.menu,
          isDark ? styles.menuDark : styles.menuLight,
          {
            opacity: fade,
            transform: [{ translateY: slide }],
          },
        ]}
      >
        {items.map((item) => {
          const isCentered = item.key === "report" || item.key === "block";

          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
                isCentered && styles.rowCentered,
              ]}
              onPress={() => {
                item.onPress();
                onClose();
              }}
            >
              <Text
                style={[
                  styles.label,
                  isDark ? styles.labelDark : styles.labelLight,
                  item.destructive && styles.destructive,
                  isCentered && styles.labelCentered,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  menu: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    width: "92%",
    maxWidth: 420,
    borderRadius: 16,
    paddingVertical: 24,
    overflow: "hidden",
  },

  menuLight: {
    backgroundColor: "#ffffff",
  },
  menuDark: {
    backgroundColor: "#111827",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: "rgba(0,0,0,0.04)",
  },

  rowCentered: {
    justifyContent: "center",
    marginVertical: 8,
  },

  label: {
    fontSize: 16,
    marginVertical: 12,
    fontWeight: "500",
  },
  labelCentered: {
    textAlign: "center",
  },
  labelLight: {
    color: "#111827",
  },
  labelDark: {
    color: "#f9fafb",
  },

  destructive: {
    color: "#ef4444",
  },

  cancel: {
    marginTop: 24,
    paddingVertical: 8,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3b82f6",
  },
});

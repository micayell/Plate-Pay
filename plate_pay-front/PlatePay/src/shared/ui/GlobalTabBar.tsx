import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useResponsive } from "../ui/responsive";

export default function GlobalTabBar({ items, activeKey, onPress }: any) {
  const { bp, fs, s } = useResponsive();
  const barH = bp === "tablet" ? s(72) : bp === "largePhone" ? s(64) : s(58);

  return (
    <View style={[styles.wrap, { height: barH, paddingVertical: s(6) }]}>
      {items.map((it: any) => {
        const active = activeKey === it.key;
        return (
          <Pressable
            key={it.key}
            style={[
              styles.item,
              { paddingHorizontal: s(12), paddingVertical: s(6), borderRadius: s(12) },
              active && { backgroundColor: "#EEF2FF" },
            ]}
            onPress={() => onPress(it.key)}
            android_ripple={{ color: "#E5E7EB" }}
          >
            {/* react-native-vector-icons 사용 시 */}
            <it.Icon name={it.iconName} size={bp === "tablet" ? s(22) : s(18)} color={active ? "#4F46E5" : "#6B7280"} />
            <Text style={{ fontSize: fs(11), color: active ? "#4F46E5" : "#6B7280", marginTop: s(2), fontWeight: active ? "700" : "500" }}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "white",
  },
  item: { alignItems: "center" },
  itemActive: { backgroundColor: "#EEF2FF" },
  icon: { fontSize: 18, marginBottom: 2 },
  label: { fontSize: 12, color: "#6B7280" },
  labelActive: { color: "#4F46E5", fontWeight: "700" },
  badge: {
    position: "absolute",
    top: 2, right: 6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "white", fontSize: 10, fontWeight: "700" },
});

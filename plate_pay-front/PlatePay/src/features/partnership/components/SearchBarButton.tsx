import React from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

type Props = {
  placeholder?: string;
  onPress: () => void;
  style?: ViewStyle;
};

export default function SearchBarButton({ onPress, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.shadowWrap}>
        <Pressable
          style={({ pressed }) => [styles.bar, pressed && { opacity: 0.85 }]}
          onPress={onPress}
        >
          <Icon
            style={styles.icon}
            name="search"
            size={20}
            color="#000"
            solid
          />
        </Pressable>
      </View>
    </View>
  );
}

const R = 22;
const H = 44;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 16,
    marginHorizontal: 30,
    marginTop: 20,
  },
  shadowWrap: {
    height: H,
    borderRadius: R,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  bar: {
    height: H,
    borderRadius: R,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  icon: { marginRight: 8 },
  placeholder: { flex: 1, fontSize: 16, color: '#8E8E93' },
});

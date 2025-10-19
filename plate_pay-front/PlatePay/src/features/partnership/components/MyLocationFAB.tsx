import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

type Props = { onPress: () => void; style?: ViewStyle };

export default function MyLocationFAB({ onPress, style }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, style]}>
      <Text style={{ fontSize: 18 }}>⦿</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute', right: 16, bottom: 180,
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
});

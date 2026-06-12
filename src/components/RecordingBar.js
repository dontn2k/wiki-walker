// src/components/RecordingBar.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { defaultTheme as T } from '../themes';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const km = (m) => (m / 1000).toFixed(1).replace('.', ',') + ' km';

export default function RecordingBar({ secs, dist, onStop }) {
  return (
    <View style={styles.bar}>
      <View style={styles.dot} />
      <Text style={styles.txt}>{fmt(secs)} · {km(dist)}</Text>
      <TouchableOpacity style={styles.stop} onPress={onStop} hitSlop={8}>
        <MaterialCommunityIcons name="stop" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', top: 102, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: T.accent, borderRadius: 999, paddingLeft: 16, paddingRight: 8, paddingVertical: 8,
    shadowColor: '#3a322a', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' },
  txt: { color: '#fff', fontSize: 13.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  stop: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
});

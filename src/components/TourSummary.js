// src/components/TourSummary.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { CATEGORY_COLORS } from '../data/categories';
import { defaultTheme as T } from '../themes';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const km = (m) => (m / 1000).toFixed(1).replace('.', ',') + ' km';

function Stat({ n, l }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

export default function TourSummary({ tour, onClose }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.h}>{tour.name || 'Deine Tour'}</Text>

        <View style={styles.stats}>
          <Stat n={fmt(tour.secs)} l="Dauer" />
          <Stat n={km(tour.dist)} l="Strecke" />
          <Stat n={String(tour.passed.length)} l="Orte" />
        </View>

        <ScrollView style={{ maxHeight: 320 }}>
          {tour.passed.length === 0 ? (
            <Text style={styles.empty}>Unterwegs wurden keine Artikel-Orte erfasst.</Text>
          ) : (
            tour.passed.map((p) => (
              <View key={p.pageid} style={styles.row}>
                <View style={[styles.cdot, { backgroundColor: CATEGORY_COLORS[p.cat] || T.accent }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.t}>{p.title}</Text>
                  <Text style={styles.time}>{fmt(Math.floor((p.t - tour.start) / 1000))}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <TouchableOpacity style={styles.close} onPress={onClose}>
          <Text style={styles.closeTxt}>Schließen</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(58,50,42,0.25)' },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingBottom: 28 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: T.line, alignSelf: 'center', marginVertical: 9 },
  h: { fontSize: 21, fontWeight: '700', color: T.ink, marginBottom: 14 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: T.surface2, borderWidth: 1, borderColor: T.line, borderRadius: 13, paddingVertical: 13, alignItems: 'center' },
  statN: { fontSize: 22, fontWeight: '700', color: T.ink },
  statL: { fontSize: 11.5, color: T.inkSoft, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: T.line },
  cdot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  t: { fontSize: 15, fontWeight: '600', color: T.ink },
  time: { fontSize: 12, color: T.accent, fontWeight: '600', marginTop: 1 },
  empty: { color: T.inkSoft, textAlign: 'center', padding: 24, fontSize: 14 },
  close: { marginTop: 14, borderWidth: 1, borderColor: T.line, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: T.surface2 },
  closeTxt: { fontSize: 14.5, fontWeight: '600', color: T.ink },
});

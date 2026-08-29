// src/components/PoiCard.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { fetchSummary, WIKI_UA } from '../services/wiki';
import { defaultTheme as T } from '../themes';

export default function PoiCard({ poi, isSaved, onSave, onClose, lang = 'de' }) {
  const [extract, setExtract] = useState(poi.extract);
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Beim Wechsel auf einen anderen POI (gleiche Card-Instanz, neue Props)
  // lokalen State zurücksetzen – sonst bleiben extract/expanded/url vom
  // vorherigen POI stehen (Bug: Beschreibung aktualisiert sich nicht beim
  // Wechseln zwischen POIs auf der Karte).
  useEffect(() => {
    setExtract(poi.extract);
    setExpanded(false);
    setUrl(null);
    setLoading(false);
  }, [poi.pageid, poi.title]);

  const readMore = async () => {
    setLoading(true);
    try {
      const s = await fetchSummary(poi.title, lang);
      if (s.extract) setExtract(s.extract);
      setUrl(s.url);
      setExpanded(true);
    } catch (e) {
      /* offline – Vorschautext bleibt */
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={10}>
          <Text style={styles.closeTxt}>×</Text>
        </TouchableOpacity>

        {!!poi.thumbnail && (
          <Image
            source={{ uri: poi.thumbnail, headers: { 'User-Agent': WIKI_UA } }}
            style={styles.thumb}
            contentFit="cover"
            transition={200}
          />
        )}

        <View style={styles.body}>
          <Text style={styles.title}>{poi.title}</Text>
          {!!poi.description && <Text style={styles.desc}>{poi.description}</Text>}

          <ScrollView style={expanded ? styles.exScroll : undefined} nestedScrollEnabled>
            <Text style={styles.extract}>{extract || 'Kein Vorschautext verfügbar.'}</Text>
          </ScrollView>

          <View style={styles.row}>
            {!expanded ? (
              <TouchableOpacity style={styles.btn} onPress={readMore} activeOpacity={0.8}>
                <Text style={styles.btnTxt}>{loading ? 'lädt …' : 'Mehr lesen'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.btn}
                onPress={() => url && Linking.openURL(url)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnTxt}>Auf Wikipedia</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, isSaved && styles.btnOn]}
              onPress={onSave}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnTxt, isSaved && styles.btnTxtOn]}>
                {isSaved ? 'Gemerkt ✓' : 'Merken'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 96, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 12 },
  card: {
    width: '100%', maxWidth: 440,
    backgroundColor: T.surface2, borderRadius: 18, borderWidth: 1, borderColor: T.line,
    overflow: 'hidden',
    shadowColor: '#3a322a', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  close: {
    position: 'absolute', top: 8, right: 8, zIndex: 2,
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  closeTxt: { fontSize: 20, color: T.inkSoft, lineHeight: 22 },
  thumb: { width: '100%', height: 150, backgroundColor: T.line },
  body: { padding: 15 },
  title: { fontSize: 20, fontWeight: '700', color: T.ink, marginBottom: 2 },
  desc: { fontSize: 13, fontWeight: '600', color: T.accent, marginBottom: 8 },
  extract: { fontSize: 14.5, lineHeight: 21, color: T.ink },
  exScroll: { maxHeight: 160 },
  row: { flexDirection: 'row', gap: 9, marginTop: 13 },
  btn: {
    flex: 1, paddingVertical: 11, borderRadius: 11, borderWidth: 1, borderColor: T.line,
    backgroundColor: T.bg, alignItems: 'center',
  },
  btnTxt: { fontSize: 14, fontWeight: '600', color: T.ink },
  btnOn: { backgroundColor: T.sage, borderColor: T.sage },
  btnTxtOn: { color: '#fff' },
});

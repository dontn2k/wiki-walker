// src/components/MenuSheet.js
import React, { useState, useRef, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView, Alert, Linking, Animated, PanResponder } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { defaultTheme as T } from '../themes';

const APP_VERSION = '1.0.0';
const FEEDBACK_EMAIL = 'tmarek@gmx.net';

function Row({ icon, label, sub, badge, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name={icon} size={23} color={disabled ? T.inkSoft : T.sage} style={{ width: 28 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, disabled && { color: T.inkSoft }]}>{label}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {badge != null && <Text style={styles.badge}>{badge}</Text>}
    </TouchableOpacity>
  );
}

function Head({ title, onBack }) {
  return (
    <View style={styles.head}>
      <TouchableOpacity onPress={onBack} hitSlop={10}>
        <MaterialCommunityIcons name="chevron-left" size={26} color={T.inkSoft} />
      </TouchableOpacity>
      <Text style={styles.headTitle}>{title}</Text>
    </View>
  );
}

export default function MenuSheet({
  visible, onClose, lang, onLang, onLocate, saved, onShowSaved, onRemoveSaved,
  isTracking, guideOn, onToggleTour, onToggleGuide, onPlace,
  tours, onOpenTour, onRenameTour, onDeleteTour, headingUp, onToggleHeadingUp,
}) {
  const [view, setView] = useState('menu');
  const savedList = Object.entries(saved || {});
  const tourList = tours || [];

  const translateY = useRef(new Animated.Value(0)).current;
  const sheetH = useRef(600);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    if (visible) {
      translateY.setValue(sheetH.current);
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    }
  }, [visible]);

  const dismiss = () => {
    Animated.timing(translateY, { toValue: sheetH.current, duration: 200, useNativeDriver: true })
      .start(() => { setView('menu'); onCloseRef.current(); });
  };
  const close = dismiss;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 3,
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.6) dismiss();
        else if (g.dy < 8) dismiss();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 3 }).start();
      },
    })
  ).current;

  const fmtDate = (ms) => {
    const d = new Date(ms);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' +
      d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };
  const km = (m) => (m / 1000).toFixed(1).replace('.', ',') + ' km';
  const renameTour = (t) => {
    Alert.prompt(
      'Route umbenennen', null,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Speichern', onPress: (txt) => { if (txt && txt.trim()) onRenameTour(t.id, txt.trim()); } },
      ],
      'plain-text', t.name
    );
  };
  const confirmDelete = (t) => {
    Alert.alert('Route löschen?', t.name, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => onDeleteTour(t.id) },
    ]);
  };
  const sendFeedback = () => {
    const url = 'mailto:' + FEEDBACK_EMAIL + '?subject=' + encodeURIComponent('wiki-walker Feedback');
    Linking.openURL(url).catch(() =>
      Alert.alert('Keine Mail-App gefunden', 'Schreib gern direkt an ' + FEEDBACK_EMAIL + '.')
    );
  };
  const openWiki = () => { Linking.openURL('https://de.wikipedia.org').catch(() => {}); };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} onLayout={(e) => { sheetH.current = e.nativeEvent.layout.height; }}>
        <View style={styles.handleHit} {...pan.panHandlers}>
          <View style={styles.handle} />
        </View>

        {view === 'menu' && (
          <>
            <Row icon="crosshairs-gps" label="Standort finden" sub="Karte auf deine Position" onPress={() => { close(); onLocate(); }} />
            <Row icon="bookmark-outline" label="Gemerkte Orte" badge={savedList.length} onPress={() => setView('saved')} />
            <Row icon="cog-outline" label="Einstellungen" onPress={() => setView('settings')} />
            <View style={styles.divider} />
            <Row
              icon={isTracking ? 'stop-circle-outline' : 'map-marker-path'}
              label={isTracking ? 'Tour beenden' : 'Tour aufzeichnen'}
              sub={isTracking ? 'Aufzeichnung läuft' : 'Weg & vorbeigegangene Orte'}
              onPress={onToggleTour}
            />
            <Row
              icon={guideOn ? 'volume-high' : 'volume-medium'}
              label="Guide / Ansagen"
              sub={guideOn ? 'an – meldet Orte unterwegs' : 'aus'}
              onPress={onToggleGuide}
            />
            <Row
              icon="map-marker-plus"
              label="Eigener Punkt setzen"
              sub="Notiz, nur auf diesem Gerät"
              onPress={onPlace}
            />
          </>
        )}

        {view === 'saved' && (
          <View>
            <Head title="Gemerkte Orte" onBack={() => setView('menu')} />
            <ScrollView style={{ maxHeight: 360 }}>
              {savedList.length === 0 ? (
                <Text style={styles.empty}>Noch nichts gemerkt.{'\n'}Tippe in einem Ort auf „Merken".</Text>
              ) : (
                savedList.map(([id, p]) => (
                  <View key={id} style={styles.item}>
                    <Text style={styles.itemTitle}>{p.title}</Text>
                    {!!p.description && <Text style={styles.itemSub}>{p.description}</Text>}
                    <View style={styles.itemRow}>
                      <TouchableOpacity style={styles.itemBtn} onPress={() => { close(); onShowSaved(p); }}>
                        <Text style={styles.itemBtnTxt}>Auf Karte zeigen</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.itemBtn} onPress={() => onRemoveSaved(id)}>
                        <Text style={styles.itemBtnTxt}>Entfernen</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {view === 'settings' && (
          <View>
            <Head title="Einstellungen" onBack={() => setView('menu')} />
            <View style={styles.setRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.setLabel}>Sprache der Artikel</Text>
                <Text style={styles.setSub}>Wikipedia-Ausgabe</Text>
              </View>
              <View style={styles.seg}>
                {['de', 'en'].map((l) => (
                  <TouchableOpacity key={l} style={[styles.segBtn, lang === l && styles.segBtnOn]} onPress={() => onLang(l)}>
                    <Text style={[styles.segTxt, lang === l && styles.segTxtOn]}>{l.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.divider} />
            <Row
              icon="compass-outline"
              label="Karte dreht mit"
              sub={headingUp ? 'an – Blickrichtung oben' : 'aus – Norden oben'}
              onPress={onToggleHeadingUp}
            />
            <Row
              icon="history"
              label="Vergangene Touren"
              badge={tourList.length}
              onPress={() => setView('tours')}
            />
            <Row
              icon="information-outline"
              label="Über & Feedback"
              onPress={() => setView('about')}
            />
          </View>
        )}

        {view === 'tours' && (
          <View>
            <Head title="Vergangene Touren" onBack={() => setView('settings')} />
            <ScrollView style={{ maxHeight: 380 }}>
              {tourList.length === 0 ? (
                <Text style={styles.empty}>Noch keine Touren aufgezeichnet.{'\n'}Starte eine über „Tour aufzeichnen".</Text>
              ) : (
                tourList.map((t) => (
                  <View key={t.id} style={styles.item}>
                    <Text style={styles.itemTitle}>{t.name || 'Route'}</Text>
                    <Text style={styles.itemSub}>{fmtDate(t.start)} · {km(t.dist || 0)} · {(t.passed && t.passed.length) || 0} Orte</Text>
                    <View style={styles.itemRow}>
                      <TouchableOpacity style={styles.itemBtn} onPress={() => { setView('menu'); onOpenTour(t); }}>
                        <Text style={styles.itemBtnTxt}>Ansehen</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.itemBtn} onPress={() => renameTour(t)}>
                        <Text style={styles.itemBtnTxt}>Umbenennen</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.itemBtn} onPress={() => confirmDelete(t)}>
                        <Text style={styles.itemBtnTxt}>Löschen</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {view === 'about' && (
          <View>
            <Head title="Über & Feedback" onBack={() => setView('settings')} />
            <View style={styles.aboutWrap}>
              <Text style={styles.aboutName}>wiki-walker</Text>
              <Text style={styles.aboutVersion}>Version {APP_VERSION}</Text>
              <Text style={styles.aboutBy}>von Toni Marek</Text>
              <Text style={styles.aboutText}>
                Entdecke Wikipedia-Orte in deiner Nähe – als Pins auf der Karte, beim Spazieren.
              </Text>
              <TouchableOpacity style={styles.aboutBtn} onPress={sendFeedback} activeOpacity={0.85}>
                <MaterialCommunityIcons name="email-outline" size={18} color="#fff" />
                <Text style={styles.aboutBtnTxt}>Feedback senden</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <Text style={styles.aboutAttr}>
                Ortsdaten und Texte stammen aus Wikipedia, lizenziert unter CC BY-SA.
              </Text>
              <TouchableOpacity onPress={openWiki}>
                <Text style={styles.aboutLink}>de.wikipedia.org</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(58,50,42,0.25)' },
  sheet: {
    backgroundColor: T.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 8, paddingBottom: 30,
  },
  handleHit: { alignSelf: 'center', paddingVertical: 9, paddingHorizontal: 50 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: T.inkSoft, opacity: 0.4, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 13 },
  rowDisabled: { opacity: 0.55 },
  rowLabel: { fontSize: 15.5, fontWeight: '600', color: T.ink },
  rowSub: { fontSize: 12, color: T.inkSoft, marginTop: 1 },
  badge: { fontSize: 12, color: T.inkSoft, backgroundColor: T.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, minWidth: 26, textAlign: 'center', overflow: 'hidden' },
  divider: { height: 1, backgroundColor: T.line, marginVertical: 6, marginHorizontal: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: 8 },
  headTitle: { fontSize: 18, fontWeight: '700', color: T.ink },
  empty: { color: T.inkSoft, textAlign: 'center', padding: 26, fontSize: 14, lineHeight: 20 },
  item: { borderWidth: 1, borderColor: T.line, borderRadius: 13, padding: 12, marginHorizontal: 12, marginVertical: 5, backgroundColor: T.surface2 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: T.ink },
  itemSub: { fontSize: 12, color: T.inkSoft, marginTop: 1, marginBottom: 8 },
  itemRow: { flexDirection: 'row', gap: 7 },
  itemBtn: { flex: 1, borderWidth: 1, borderColor: T.line, borderRadius: 9, paddingVertical: 6, alignItems: 'center', backgroundColor: T.surface },
  itemBtnTxt: { fontSize: 12.5, color: T.ink },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14 },
  setLabel: { fontSize: 14.5, fontWeight: '600', color: T.ink },
  setSub: { fontSize: 12, color: T.inkSoft, marginTop: 1 },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: T.line, borderRadius: 9, overflow: 'hidden' },
  segBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: T.surface2 },
  segBtnOn: { backgroundColor: T.sage },
  segTxt: { fontSize: 13, color: T.ink },
  segTxtOn: { color: '#fff' },
  note: { fontSize: 12, color: T.inkSoft, paddingHorizontal: 12, paddingTop: 6, lineHeight: 18 },
  aboutWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, alignItems: 'center' },
  aboutName: { fontFamily: 'YoungSerif', fontSize: 26, color: T.ink },
  aboutVersion: { fontSize: 13, color: T.inkSoft, marginTop: 4 },
  aboutBy: { fontSize: 13, color: T.inkSoft, marginTop: 1 },
  aboutText: { fontSize: 13.5, color: T.ink, textAlign: 'center', lineHeight: 19, marginTop: 14, marginBottom: 2, paddingHorizontal: 4 },
  aboutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.accent, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12, marginTop: 16 },
  aboutBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  aboutAttr: { fontSize: 12, color: T.inkSoft, textAlign: 'center', lineHeight: 18, marginTop: 4, paddingHorizontal: 6 },
  aboutLink: { fontSize: 12.5, color: T.sage, fontWeight: '600', marginTop: 6 },
});

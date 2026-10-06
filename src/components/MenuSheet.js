// src/components/MenuSheet.js
import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView, Alert, Linking, Animated, PanResponder } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIAP, ErrorCode } from 'react-native-iap';
import { defaultTheme as T } from '../themes';
import { useI18n, wikiHost } from '../i18n';
import appJson from '../../app.json';

// Versionsnummer aus app.json - das ist auch die Quelle, aus der der
// prebuild CFBundleShortVersionString in die Info.plist schreibt.
// Bewusst kein expo-constants: das Paket ist hier nicht installiert und
// wuerde einen neuen Native-Build erzwingen.
const APP_VERSION = appJson.expo.version;
const FEEDBACK_EMAIL = 'wikiwalker@tonimarek.de';

// Consumable In-App-Purchases - Produkt-IDs muessen 1:1 so in App Store
// Connect UND Google Play Console angelegt werden, sonst liefert
// fetchProducts() sie nicht zurueck. Die fallbackPrice-Texte sind nur die
// Anzeige vor dem ersten erfolgreichen Laden - die tatsaechlichen,
// lokalisierten Preise kommen von den Stores selbst (siehe tipPriceFor()).
const TIP_SKUS = ['tip_tea_1', 'tip_coffee_4'];
const TIP_INFO = {
  tip_tea_1: { labelKey: 'tip.tea', icon: 'tea-outline', fallbackPrice: '1 €' },
  tip_coffee_4: { labelKey: 'tip.coffee', icon: 'coffee-outline', fallbackPrice: '4 €' },
};

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
  const { t, lang: uiLang, locale, km } = useI18n();
  const [view, setView] = useState('menu');
  const savedList = Object.entries(saved || {});
  const tourList = tours || [];

  // Freiwillige Unterstuetzung (Tee/Kaffee) via In-App-Purchase. Kein
  // externer Spenden-Link (Ko-fi o.ae.) - das lehnen Apple/Google fuer
  // Zahlungen innerhalb der App ab, siehe App Store Review Guideline 3.1.1.
  const [tipSku, setTipSku] = useState(null);
  const [tipStatus, setTipStatus] = useState('idle'); // idle | pending | done | error

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        await finishTransaction({ purchase, isConsumable: true });
        setTipStatus('done');
      } catch {
        setTipStatus('error');
      }
    },
    onPurchaseError: (error) => {
      setTipStatus(error.code === ErrorCode.UserCancelled ? 'idle' : 'error');
    },
  });

  useEffect(() => {
    if (connected) fetchProducts({ skus: TIP_SKUS, type: 'in-app' });
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  function tipPriceFor(sku) {
    const p = (products || []).find((x) => x.id === sku || x.productId === sku);
    // Feld fuer den lokalisierten Preis kann je nach react-native-iap-Version
    // leicht anders heissen (displayPrice/localizedPrice/price) - hier
    // defensiv mehrere Varianten probieren, sonst Fallback-Text.
    return p?.displayPrice || p?.localizedPrice || p?.price || TIP_INFO[sku].fallbackPrice;
  }

  function confirmTip() {
    if (!tipSku) return;
    setTipStatus('pending');
    requestPurchase({
      request: { apple: { sku: tipSku }, google: { skus: [tipSku] } },
      type: 'in-app',
    }).catch(() => setTipStatus('idle'));
  }

  function openTipView() {
    setTipSku(null);
    setTipStatus('idle');
    setView('tip');
  }

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
    return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }) + ' ' +
      d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };
  const renameTour = (tour) => {
    Alert.prompt(
      t('tours.renameTitle'), null,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.save'), onPress: (txt) => { if (txt && txt.trim()) onRenameTour(tour.id, txt.trim()); } },
      ],
      'plain-text', tour.name
    );
  };
  const confirmDelete = (tour) => {
    Alert.alert(t('tours.deleteTitle'), tour.name, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => onDeleteTour(tour.id) },
    ]);
  };
  const sendFeedback = () => {
    const url = 'mailto:' + FEEDBACK_EMAIL + '?subject=' + encodeURIComponent(t('mail.subject'));
    Linking.openURL(url).catch(() =>
      Alert.alert(t('mail.noApp'), t('mail.noAppBody', { mail: FEEDBACK_EMAIL }))
    );
  };
  const openWiki = () => { Linking.openURL('https://' + wikiHost(uiLang)).catch(() => {}); };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} onLayout={(e) => { sheetH.current = e.nativeEvent.layout.height; }}>
        <View style={styles.handleHit} {...pan.panHandlers}>
          <View style={styles.handle} />
        </View>

        {view === 'menu' && (
          <>
            <Row icon="crosshairs-gps" label={t('menu.locate')} sub={t('menu.locateSub')} onPress={() => { close(); onLocate(); }} />
            <Row icon="bookmark-outline" label={t('menu.saved')} badge={savedList.length} onPress={() => setView('saved')} />
            <Row icon="cog-outline" label={t('menu.settings')} onPress={() => setView('settings')} />
            <View style={styles.divider} />
            <Row
              icon={isTracking ? 'stop-circle-outline' : 'map-marker-path'}
              label={isTracking ? t('menu.tourStop') : t('menu.tourStart')}
              sub={isTracking ? t('menu.tourSubOn') : t('menu.tourSubOff')}
              onPress={onToggleTour}
            />
            <Row
              icon={guideOn ? 'volume-high' : 'volume-medium'}
              label={t('menu.guide')}
              sub={guideOn ? t('menu.guideOn') : t('menu.guideOff')}
              onPress={onToggleGuide}
            />
            <Row
              icon="map-marker-plus"
              label={t('menu.place')}
              sub={t('menu.placeSub')}
              onPress={onPlace}
            />
          </>
        )}

        {view === 'saved' && (
          <View>
            <Head title={t('menu.saved')} onBack={() => setView('menu')} />
            <ScrollView style={{ maxHeight: 360 }}>
              {savedList.length === 0 ? (
                <Text style={styles.empty}>{t('saved.empty')}</Text>
              ) : (
                savedList.map(([id, p]) => (
                  <View key={id} style={styles.item}>
                    <Text style={styles.itemTitle}>{p.title}</Text>
                    {!!p.description && <Text style={styles.itemSub}>{p.description}</Text>}
                    <View style={styles.itemRow}>
                      <TouchableOpacity style={styles.itemBtn} onPress={() => { close(); onShowSaved(p); }}>
                        <Text style={styles.itemBtnTxt}>{t('saved.show')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.itemBtn} onPress={() => onRemoveSaved(id)}>
                        <Text style={styles.itemBtnTxt}>{t('saved.remove')}</Text>
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
            <Head title={t('menu.settings')} onBack={() => setView('menu')} />
            <View style={styles.setRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.setLabel}>{t('settings.language')}</Text>
                <Text style={styles.setSub}>{t('settings.languageSub')}</Text>
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
              label={t('settings.headingUp')}
              sub={headingUp ? t('settings.headingUpOn') : t('settings.headingUpOff')}
              onPress={onToggleHeadingUp}
            />
            <Row
              icon="history"
              label={t('settings.tours')}
              badge={tourList.length}
              onPress={() => setView('tours')}
            />
            <Row
              icon="information-outline"
              label={t('settings.about')}
              onPress={() => setView('about')}
            />
          </View>
        )}

        {view === 'tours' && (
          <View>
            <Head title={t('tours.title')} onBack={() => setView('settings')} />
            <ScrollView style={{ maxHeight: 380 }}>
              {tourList.length === 0 ? (
                <Text style={styles.empty}>{t('tours.empty')}</Text>
              ) : (
                tourList.map((tour) => (
                  <View key={tour.id} style={styles.item}>
                    <Text style={styles.itemTitle}>{tour.name || t('tours.fallbackName')}</Text>
                    <Text style={styles.itemSub}>{fmtDate(tour.start)} · {km(tour.dist || 0)} · {(tour.passed && tour.passed.length) || 0} {t('common.places')}</Text>
                    <View style={styles.itemRow}>
                      <TouchableOpacity style={styles.itemBtn} onPress={() => { setView('menu'); onOpenTour(tour); }}>
                        <Text style={styles.itemBtnTxt}>{t('tours.view')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.itemBtn} onPress={() => renameTour(tour)}>
                        <Text style={styles.itemBtnTxt}>{t('tours.rename')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.itemBtn} onPress={() => confirmDelete(tour)}>
                        <Text style={styles.itemBtnTxt}>{t('common.delete')}</Text>
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
            <Head title={t('settings.about')} onBack={() => setView('settings')} />
            <View style={styles.aboutWrap}>
              <Text style={styles.aboutName}>wiki-walker</Text>
              <Text style={styles.aboutVersion}>{t('about.version', { v: APP_VERSION })}</Text>
              <Text style={styles.aboutBy}>{t('about.by')}</Text>
              <Text style={styles.aboutText}>{t('about.text')}</Text>
              <TouchableOpacity style={styles.aboutBtn} onPress={sendFeedback} activeOpacity={0.85}>
                <MaterialCommunityIcons name="email-outline" size={18} color="#fff" />
                <Text style={styles.aboutBtnTxt}>{t('about.feedback')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tipEntryBtn} onPress={openTipView} activeOpacity={0.85}>
                <MaterialCommunityIcons name="hand-coin-outline" size={18} color={T.sage} />
                <Text style={styles.tipEntryBtnTxt}>{t('about.support')}</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <Text style={styles.aboutAttr}>{t('about.attr')}</Text>
              <TouchableOpacity onPress={openWiki}>
                <Text style={styles.aboutLink}>{wikiHost(uiLang)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {view === 'tip' && (
          <View>
            <Head title={t('tip.title')} onBack={() => setView('about')} />
            <View style={styles.aboutWrap}>
              <Text style={styles.tipIntro}>{t('tip.intro')}</Text>

              <View style={styles.tipOptions}>
                {TIP_SKUS.map((sku) => (
                  <TouchableOpacity
                    key={sku}
                    style={[styles.tipCard, tipSku === sku && { borderColor: T.accent, borderWidth: 2 }]}
                    onPress={() => setTipSku(sku)}
                  >
                    <MaterialCommunityIcons name={TIP_INFO[sku].icon} size={26} color={T.sage} />
                    <Text style={styles.tipCardLabel}>{t(TIP_INFO[sku].labelKey)}</Text>
                    <Text style={styles.tipCardPrice}>{tipPriceFor(sku)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.aboutBtn, { alignSelf: 'stretch', justifyContent: 'center', opacity: tipSku && tipStatus !== 'pending' ? 1 : 0.4 }]}
                disabled={!tipSku || tipStatus === 'pending'}
                onPress={confirmTip}
              >
                <Text style={styles.aboutBtnTxt}>{tipStatus === 'pending' ? t('tip.pending') : t('tip.confirm')}</Text>
              </TouchableOpacity>

              {tipStatus === 'done' && <Text style={styles.tipDone}>{t('tip.done')}</Text>}
              {tipStatus === 'error' && <Text style={styles.tipErrorTxt}>{t('tip.error')}</Text>}
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
  tipEntryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: T.line,
    backgroundColor: T.surface2, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 12, marginTop: 10,
  },
  tipEntryBtnTxt: { color: T.ink, fontSize: 14.5, fontWeight: '600' },
  tipIntro: { fontSize: 13.5, color: T.ink, textAlign: 'center', lineHeight: 19, paddingHorizontal: 6, marginBottom: 4 },
  tipOptions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  tipCard: {
    borderWidth: 1, borderColor: T.line, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20,
    alignItems: 'center', gap: 6, backgroundColor: T.surface2, minWidth: 100,
  },
  tipCardLabel: { fontSize: 14, fontWeight: '700', color: T.ink },
  tipCardPrice: { fontSize: 13, color: T.inkSoft },
  tipDone: { fontSize: 13.5, color: T.sage, fontWeight: '600', marginTop: 14, textAlign: 'center' },
  tipErrorTxt: { fontSize: 13, color: '#c05a4e', marginTop: 14, textAlign: 'center' },
  aboutAttr: { fontSize: 12, color: T.inkSoft, textAlign: 'center', lineHeight: 18, marginTop: 4, paddingHorizontal: 6 },
  aboutLink: { fontSize: 12.5, color: T.sage, fontWeight: '600', marginTop: 6 },
});

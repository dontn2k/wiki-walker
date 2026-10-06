// src/components/MapScreen.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { fetchNearby, fetchSummary } from '../services/wiki';
import { categorize, CATEGORY_COLORS, CATEGORY_ICONS } from '../data/categories';
import * as storage from '../services/storage';
import PoiCard from './PoiCard';
import MenuSheet from './MenuSheet';
import PointForm from './PointForm';
import RecordingBar from './RecordingBar';
import TourSummary from './TourSummary';
import SplashOverlay from './SplashOverlay';
import { defaultTheme as T } from '../themes';
import { useI18n, translate } from '../i18n';

const DEFAULT_REGION = { latitude: 47.66119, longitude: 10.347, latitudeDelta: 0.06, longitudeDelta: 0.06 };
const GOLD = '#cf9a40';
// iOS = Apple Karten (kein Schlüssel), Android = Google Maps (API-Key in app.json)
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

function distMeters(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * toR;
  const dLon = (b.longitude - a.longitude) * toR;
  const la1 = a.latitude * toR, la2 = b.latitude * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function bearing(a, b) {
  const toR = Math.PI / 180, toD = 180 / Math.PI;
  const lat1 = a.latitude * toR, lat2 = b.latitude * toR;
  const dLon = (b.longitude - a.longitude) * toR;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * toD + 360) % 360;
}
function dirWord(rel, lang) {
  const a = ((rel % 360) + 540) % 360 - 180;
  const abs = Math.abs(a);
  if (abs <= 35) return translate(lang, 'guide.ahead');
  if (abs >= 145) return translate(lang, 'guide.behind');
  return a > 0 ? translate(lang, 'guide.right') : translate(lang, 'guide.left');
}

// Pin-Komponente: farbiger Kreis mit Kategorie-Symbol.
// tracksViewChanges wird nach kurzer Zeit abgeschaltet (Performance bei vielen Markern).
function Pin({ poi, onPress }) {
  const [track, setTrack] = useState(true);
  useEffect(() => { const t = setTimeout(() => setTrack(false), 1500); return () => clearTimeout(t); }, []);
  const color = CATEGORY_COLORS[poi.cat] || '#8a7d6a';
  const icon = CATEGORY_ICONS[poi.cat];
  return (
    <Marker
      coordinate={{ latitude: poi.lat, longitude: poi.lon }}
      onPress={onPress}
      tracksViewChanges={track}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.pin, { backgroundColor: color }]}>
        {icon ? <MaterialCommunityIcons name={icon} size={15} color="#fff" /> : <View style={styles.pinDot} />}
      </View>
    </Marker>
  );
}
function MyPin({ point, onPress }) {
  const [track, setTrack] = useState(true);
  useEffect(() => { const t = setTimeout(() => setTrack(false), 1500); return () => clearTimeout(t); }, []);
  return (
    <Marker
      coordinate={{ latitude: point.lat, longitude: point.lon }}
      onPress={onPress}
      tracksViewChanges={track}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.pin, { backgroundColor: GOLD }]}>
        <MaterialCommunityIcons name="star" size={15} color="#fff" />
      </View>
    </Marker>
  );
}

export default function MapScreen() {
  // Sprache kommt aus dem LangProvider (App.js) und steuert Oberflaeche,
  // Wikipedia-Ausgabe und Sprachausgabe gleichzeitig.
  const { lang, setLang, t } = useI18n();
  const mapRef = useRef(null);
  const reqId = useRef(0);
  const lastMarkerTap = useRef(0);
  const regionRef = useRef(DEFAULT_REGION);
  const prevRegionRef = useRef(null);
  const poisRef = useRef([]);
  const lastLoaded = useRef(null);

  const [pois, setPois] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ k: 'status.ready' });
  const [userLoc, setUserLoc] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const langRef = useRef(lang);

  const [myPoints, setMyPoints] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [editPoint, setEditPoint] = useState(null);

  const [tracking, setTracking] = useState(false);
  const [trackCoords, setTrackCoords] = useState([]);
  const [recInfo, setRecInfo] = useState({ secs: 0, dist: 0 });
  const [tour, setTour] = useState(null);
  const [tours, setTours] = useState([]);
  const [splashDone, setSplashDone] = useState(false);
  const trackSub = useRef(null);
  const trackPts = useRef([]);
  const trackDist = useRef(0);
  const trackStart = useRef(0);
  const passedRef = useRef(new Map());
  const recTimer = useRef(null);

  const [guideOn, setGuideOn] = useState(false);
  const [ask, setAsk] = useState(null);
  const guideSub = useRef(null);
  const guideOnRef = useRef(false);
  const announcedRef = useRef(new Set());
  const busyRef = useRef(false);
  const askTimer = useRef(null);

  const [headingUp, setHeadingUp] = useState(false);
  const headingUpRef = useRef(false);
  const headingRef = useRef(null);
  const headingSub = useRef(null);
  const lastRotRef = useRef(0);

  // ---------- POIs laden ----------
  const loadForRegion = useCallback(async (region) => {
    const radius = Math.min(Math.max(Math.round((region.latitudeDelta / 2) * 111000), 200), 10000);
    const id = ++reqId.current;
    setLoading(true);
    setStatus({ k: 'status.searching' });
    try {
      const list = await fetchNearby(region.latitude, region.longitude, radius, langRef.current);
      if (id !== reqId.current) return;
      const withCat = list.map((p) => ({ ...p, cat: categorize(`${p.description} ${p.extract}`) }));
      setPois(withCat);
      poisRef.current = withCat;
      setStatus(withCat.length ? { k: 'status.found', p: { n: withCat.length } } : { k: 'status.none' });
    } catch (e) {
      if (id === reqId.current) setStatus({ k: 'status.offline' });
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForRegion(DEFAULT_REGION);
    lastLoaded.current = DEFAULT_REGION;
    storage.getItem('wikiwalker.points', []).then((pts) => setMyPoints(pts || []));
    storage.getItem('wikiwalker.saved', {}).then((s) => { if (s) setSaved(s); });
    storage.getItem('wikiwalker.tours', []).then((list) => {
      const fixed = (list || []).map((t, i) => ({
        ...t,
        id: t.id || ('t' + (t.start || (Date.now() - i)) + '_' + i),
        name: t.name || ('Route #' + ((list || []).length - i)),
      }));
      setTours(fixed);
    });
    return () => {
      if (trackSub.current) trackSub.current.remove();
      if (guideSub.current) guideSub.current.remove();
      if (headingSub.current) headingSub.current.remove();
      if (recTimer.current) clearInterval(recTimer.current);
      if (askTimer.current) clearTimeout(askTimer.current);
      Speech.stop();
    };
  }, [loadForRegion]);

  // langRef spiegelt die Sprache fuer die asynchronen Callbacks (Guide,
  // Standort-Watcher), die nicht bei jedem Render neu gebunden werden.
  useEffect(() => { langRef.current = lang; }, [lang]);

  // ---------- Karten-Ereignisse ----------
  const onRegionChange = (region) => {
    regionRef.current = region;
    const last = lastLoaded.current;
    if (last) {
      const moved = distMeters(last, region);
      const zoomChange = Math.abs(region.latitudeDelta - last.latitudeDelta) / last.latitudeDelta;
      if (moved < 25 && zoomChange < 0.15) return;
    }
    lastLoaded.current = region;
    loadForRegion(region);
  };
  const onMapPress = (e) => {
    const c = e.nativeEvent && e.nativeEvent.coordinate;
    if (!c) return;
    if (placing) { addPointAt(c); return; }
    if (Date.now() - lastMarkerTap.current > 300) closeCard();
  };

  // ---------- Standort ----------
  const locate = async () => {
    setStatus({ k: 'status.locating' });
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') { setStatus({ k: 'status.locationDenied' }); return; }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    setUserLoc(loc);
    mapRef.current?.animateToRegion({ ...loc, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 600);
  };

  // ---------- POI auswählen / schließen ----------
  const selectPoi = (poi) => {
    lastMarkerTap.current = Date.now();
    if (!selected) prevRegionRef.current = regionRef.current;
    const r = regionRef.current || DEFAULT_REGION;
    mapRef.current?.animateToRegion({
      latitude: poi.lat + r.latitudeDelta * 0.2,
      longitude: poi.lon,
      latitudeDelta: r.latitudeDelta,
      longitudeDelta: r.longitudeDelta,
    }, 500);
    setSelected(poi);
  };
  const closeCard = () => {
    setSelected(null);
    // Karte bleibt an Ort und Stelle – kein Zurückspringen zum Standort
  };

  // ---------- Merken (persistiert) ----------
  const toggleSave = (poi) =>
    setSaved((prev) => {
      const n = { ...prev };
      if (n[poi.pageid]) delete n[poi.pageid];
      else n[poi.pageid] = { pageid: poi.pageid, title: poi.title, description: poi.description, lat: poi.lat, lon: poi.lon };
      storage.setItem('wikiwalker.saved', n);
      return n;
    });
  const removeSaved = (id) =>
    setSaved((prev) => { const n = { ...prev }; delete n[id]; storage.setItem('wikiwalker.saved', n); return n; });

  const changeLang = (l) => { setLang(l); langRef.current = l; loadForRegion(regionRef.current || DEFAULT_REGION); };

  // ---------- Eigene Punkte ----------
  const startPlacing = () => { setPlacing(true); setStatus({ k: 'status.tapMap' }); };
  const addPointAt = (coord) => {
    setPlacing(false);
    setStatus({ k: 'status.ready' });
    setEditPoint({ id: 'p' + Date.now(), lat: coord.latitude, lon: coord.longitude, title: '', note: '', isNew: true });
  };
  const savePoint = (pt) => {
    setMyPoints((prev) => {
      const clean = { id: pt.id, lat: pt.lat, lon: pt.lon, title: pt.title, note: pt.note };
      const next = prev.some((x) => x.id === pt.id) ? prev.map((x) => (x.id === pt.id ? clean : x)) : [...prev, clean];
      storage.setItem('wikiwalker.points', next);
      return next;
    });
    setEditPoint(null);
  };
  const deletePoint = (id) => {
    setMyPoints((prev) => { const next = prev.filter((x) => x.id !== id); storage.setItem('wikiwalker.points', next); return next; });
    setEditPoint(null);
  };

  // ---------- Tour-Aufzeichnung ----------
  const onTrackPos = (pos) => {
    const { latitude, longitude } = pos.coords;
    const pts = trackPts.current;
    if (pts.length) trackDist.current += distMeters(pts[pts.length - 1], { latitude, longitude });
    pts.push({ latitude, longitude });
    setTrackCoords(pts.slice());
    setUserLoc({ latitude, longitude });
    poisRef.current.forEach((p) => {
      if (!passedRef.current.has(p.pageid) && distMeters({ latitude, longitude }, { latitude: p.lat, longitude: p.lon }) < 80)
        passedRef.current.set(p.pageid, { ...p, t: Date.now() });
    });
  };
  const startTracking = async () => {
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') { setStatus({ k: 'status.locationDenied' }); return; }
    trackPts.current = []; trackDist.current = 0; passedRef.current = new Map(); trackStart.current = Date.now();
    setTrackCoords([]); setRecInfo({ secs: 0, dist: 0 }); setTracking(true);
    activateKeepAwakeAsync().catch(() => {});
    trackSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 2000 },
      onTrackPos
    );
    recTimer.current = setInterval(
      () => setRecInfo({ secs: Math.floor((Date.now() - trackStart.current) / 1000), dist: trackDist.current }),
      1000
    );
  };
  const stopTracking = async () => {
    setTracking(false);
    if (trackSub.current) { trackSub.current.remove(); trackSub.current = null; }
    if (recTimer.current) { clearInterval(recTimer.current); recTimer.current = null; }
    deactivateKeepAwake().catch(() => {});
    let counter = await storage.getItem('wikiwalker.tourCounter', null);
    const prevTours = await storage.getItem('wikiwalker.tours', []);
    if (counter == null) counter = (prevTours || []).length;
    counter += 1;
    storage.setItem('wikiwalker.tourCounter', counter);
    const t = {
      id: 't' + Date.now(),
      name: 'Route #' + counter,
      start: trackStart.current,
      secs: Math.floor((Date.now() - trackStart.current) / 1000),
      dist: trackDist.current,
      coords: trackPts.current.slice(),
      passed: [...passedRef.current.values()].sort((a, b) => a.t - b.t),
    };
    setTour(t);
    setTours((prev) => { const next = [t, ...prev].slice(0, 50); storage.setItem('wikiwalker.tours', next); return next; });
  };
  const toggleTour = () => { if (tracking) stopTracking(); else startTracking(); };

  // ---------- Tour-Verlauf ----------
  const renameTour = (id, name) =>
    setTours((prev) => { const next = prev.map((t) => (t.id === id ? { ...t, name } : t)); storage.setItem('wikiwalker.tours', next); return next; });
  const deleteTour = (id) =>
    setTours((prev) => { const next = prev.filter((t) => t.id !== id); storage.setItem('wikiwalker.tours', next); return next; });
  const openTour = (t) => { setMenuOpen(false); setTimeout(() => setTour(t), 320); };

  // ---------- Kompass / Blickrichtung (Sprachführung + optional Kartendrehung) ----------
  const updateHeadingWatch = async () => {
    const need = guideOnRef.current || headingUpRef.current;
    if (need && !headingSub.current) {
      try {
        headingSub.current = await Location.watchHeadingAsync((h) => {
          const deg = (h.trueHeading != null && h.trueHeading >= 0) ? h.trueHeading : h.magHeading;
          headingRef.current = deg;
          if (headingUpRef.current && mapRef.current) {
            let d = Math.abs(deg - lastRotRef.current);
            d = Math.min(d, 360 - d);
            if (d > 4) {
              lastRotRef.current = deg;
              mapRef.current.animateCamera({ heading: deg }, { duration: 200 });
            }
          }
        });
      } catch (e) { /* Kompass nicht verfügbar */ }
    } else if (!need && headingSub.current) {
      headingSub.current.remove(); headingSub.current = null;
      headingRef.current = null;
    }
  };
  const toggleHeadingUp = () => {
    const next = !headingUpRef.current;
    headingUpRef.current = next;
    setHeadingUp(next);
    updateHeadingWatch();
    if (!next) {
      lastRotRef.current = 0;
      mapRef.current?.animateCamera({ heading: 0 }, { duration: 300 }); // zurück auf Norden
    } else if (headingRef.current != null) {
      lastRotRef.current = headingRef.current;
      mapRef.current?.animateCamera({ heading: headingRef.current }, { duration: 300 });
    }
  };

  // ---------- Guide ----------
  const announce = (poi, here) => {
    announcedRef.current.add(poi.pageid);
    busyRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const l = langRef.current;
    let lead = translate(l, 'guide.nearby');
    if (headingRef.current != null && here) {
      const rel = bearing(here, { latitude: poi.lat, longitude: poi.lon }) - headingRef.current;
      lead = dirWord(rel, l);
    }
    Speech.stop();
    Speech.speak(
      translate(l, 'guide.askSpeech', { lead, title: poi.title }),
      { language: l === 'de' ? 'de-DE' : 'en-US' }
    );
    setAsk(poi);
    if (askTimer.current) clearTimeout(askTimer.current);
    askTimer.current = setTimeout(() => { setAsk(null); busyRef.current = false; }, 14000);
  };
  const onGuidePos = (pos) => {
    const here = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    setUserLoc(here);
    if (busyRef.current) return;
    let best = null, bestD = 1e9;
    poisRef.current.forEach((p) => {
      if (announcedRef.current.has(p.pageid)) return;
      const d = distMeters(here, { latitude: p.lat, longitude: p.lon });
      if (d < 70 && d < bestD) { best = p; bestD = d; }
    });
    if (best) announce(best, here);
  };
  const startGuide = async () => {
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') { setStatus({ k: 'status.locationDenied' }); return; }
    setGuideOn(true); guideOnRef.current = true; announcedRef.current = new Set(); busyRef.current = false;
    const l = langRef.current;
    Speech.speak(
      translate(l, 'guide.active'),
      { language: l === 'de' ? 'de-DE' : 'en-US' }
    );
    guideSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 },
      onGuidePos
    );
    updateHeadingWatch();
  };
  const stopGuide = () => {
    setGuideOn(false); guideOnRef.current = false;
    if (guideSub.current) { guideSub.current.remove(); guideSub.current = null; }
    if (askTimer.current) clearTimeout(askTimer.current);
    Speech.stop(); setAsk(null); busyRef.current = false;
    updateHeadingWatch();
  };
  const toggleGuide = () => { if (guideOn) stopGuide(); else startGuide(); };
  const answerYes = async () => {
    const poi = ask;
    setAsk(null);
    if (askTimer.current) clearTimeout(askTimer.current);
    if (!poi) { busyRef.current = false; return; }
    let text = poi.description || '';
    try { const s = await fetchSummary(poi.title, langRef.current); if (s.extract) text = s.extract; } catch (e) {}
    Speech.stop();
    Speech.speak(`${poi.title}. ${text}`, {
      language: langRef.current === 'de' ? 'de-DE' : 'en-US',
      onDone: () => { busyRef.current = false; },
      onStopped: () => { busyRef.current = false; },
      onError: () => { busyRef.current = false; },
    });
  };
  const answerNo = () => {
    setAsk(null);
    if (askTimer.current) clearTimeout(askTimer.current);
    Speech.stop();
    busyRef.current = false;
  };

  // ---------- Render ----------
  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        provider={MAP_PROVIDER}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onRegionChangeComplete={onRegionChange}
        onPress={onMapPress}
      >
        {pois.map((p) => (
          <Pin key={'poi' + p.pageid} poi={p} onPress={() => selectPoi(p)} />
        ))}
        {myPoints.map((p) => (
          <MyPin
            key={'mine' + p.id}
            point={p}
            onPress={() => { lastMarkerTap.current = Date.now(); setEditPoint({ ...p }); }}
          />
        ))}
        {trackCoords.length > 1 && (
          <Polyline coordinates={trackCoords} strokeColor={T.accent} strokeWidth={5} />
        )}
      </MapView>

      <View style={styles.statusChip}>
        {loading && <ActivityIndicator size="small" color={T.accent} style={{ marginRight: 7 }} />}
        <Text style={styles.statusText}>{placing ? t('status.tapMapShort') : t(status.k, status.p)}</Text>
      </View>

      {tracking && <RecordingBar secs={recInfo.secs} dist={recInfo.dist} onStop={stopTracking} />}

      <TouchableOpacity style={styles.fab} onPress={locate} activeOpacity={0.85}>
        <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.fab, styles.fabMenu]} onPress={() => setMenuOpen(true)} activeOpacity={0.85}>
        <MaterialCommunityIcons name="menu" size={24} color={T.ink} />
      </TouchableOpacity>

      {selected && (
        <PoiCard
          poi={selected}
          lang={lang}
          isSaved={!!saved[selected.pageid]}
          onSave={() => toggleSave(selected)}
          onClose={closeCard}
        />
      )}

      {ask && (
        <View style={styles.ask}>
          <Text style={styles.askTitle} numberOfLines={1}>{ask.title}</Text>
          <Text style={styles.askSub}>{t('ask.more')}</Text>
          <View style={styles.askRow}>
            <TouchableOpacity style={[styles.askBtn, styles.askYes]} onPress={answerYes}>
              <Text style={styles.askYesTxt}>{t('ask.yes')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.askBtn} onPress={answerNo}>
              <Text style={styles.askTxt}>{t('ask.no')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <MenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        lang={lang}
        onLang={changeLang}
        onLocate={locate}
        saved={saved}
        onShowSaved={(poi) => selectPoi(poi)}
        onRemoveSaved={removeSaved}
        isTracking={tracking}
        guideOn={guideOn}
        onToggleTour={() => { setMenuOpen(false); toggleTour(); }}
        onToggleGuide={() => { setMenuOpen(false); toggleGuide(); }}
        onPlace={() => { setMenuOpen(false); startPlacing(); }}
        tours={tours}
        onOpenTour={openTour}
        onRenameTour={renameTour}
        onDeleteTour={deleteTour}
        headingUp={headingUp}
        onToggleHeadingUp={toggleHeadingUp}
      />

      {editPoint && (
        <PointForm point={editPoint} onSave={savePoint} onDelete={deletePoint} onClose={() => setEditPoint(null)} />
      )}

      {tour && <TourSummary tour={tour} onClose={() => setTour(null)} />}

      {!splashDone && <SplashOverlay onDone={() => setSplashDone(true)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  pin: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  pinDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#fff' },
  statusChip: {
    position: 'absolute', top: 58, alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface2, borderColor: T.line, borderWidth: 1, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 7,
    shadowColor: '#3a322a', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  statusText: { fontSize: 13, color: T.inkSoft, fontWeight: '500' },
  fab: {
    position: 'absolute', right: 18, bottom: 36, width: 54, height: 54, borderRadius: 27,
    backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3a322a', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabMenu: { bottom: 104, backgroundColor: T.surface2, borderWidth: 1, borderColor: T.line },
  ask: {
    position: 'absolute', left: 16, right: 84, bottom: 34,
    backgroundColor: T.surface2, borderRadius: 16, borderWidth: 1, borderColor: T.line, padding: 14,
    shadowColor: '#3a322a', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  askTitle: { fontSize: 16, fontWeight: '700', color: T.ink },
  askSub: { fontSize: 13, color: T.inkSoft, marginTop: 1, marginBottom: 11 },
  askRow: { flexDirection: 'row', gap: 8 },
  askBtn: { flex: 1, borderWidth: 1, borderColor: T.line, borderRadius: 10, paddingVertical: 9, alignItems: 'center', backgroundColor: T.bg },
  askYes: { backgroundColor: T.sage, borderColor: T.sage },
  askYesTxt: { fontSize: 13.5, fontWeight: '600', color: '#fff' },
  askTxt: { fontSize: 13.5, fontWeight: '600', color: T.ink },
});

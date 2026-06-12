// src/components/MapScreen.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { fetchNearby, fetchSummary } from '../services/wiki';
import { categorize, CATEGORY_COLORS } from '../data/categories';
import * as storage from '../services/storage';
import PoiCard from './PoiCard';
import MenuSheet from './MenuSheet';
import PointForm from './PointForm';
import RecordingBar from './RecordingBar';
import TourSummary from './TourSummary';
import SplashOverlay from './SplashOverlay';
import { defaultTheme as T } from '../themes';

const DEFAULT_REGION = { latitude: 47.66119, longitude: 10.347, latitudeDelta: 0.06, longitudeDelta: 0.06 };
const GOLD = '#cf9a40';

// OpenStreetMap-Karte (Leaflet) als HTML in der WebView – kein Schlüssel, kein Konto
const MAP_HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#map{height:100%;margin:0;padding:0;background:#efe4d2;}
.pin{width:28px;height:28px;border-radius:14px;border:2px solid rgba(255,255,255,0.92);box-shadow:0 1px 3px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;}
.pin .dot{width:8px;height:8px;border-radius:4px;background:#fff;}
.udot{width:16px;height:16px;border-radius:8px;background:#2f7fae;border:3px solid #fff;box-shadow:0 0 0 6px rgba(47,127,174,0.25);}
.leaflet-control-attribution{font-size:9px;background:rgba(255,255,255,0.7);}
</style></head><body><div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false}).setView([47.66119,10.347],14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
var poiLayer=L.layerGroup().addTo(map),mineLayer=L.layerGroup().addTo(map),userMarker=null,track=null;
function send(o){if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify(o));}}
function region(){var c=map.getCenter(),b=map.getBounds();send({type:'region',lat:c.lat,lon:c.lng,latD:Math.abs(b.getNorth()-b.getSouth()),lonD:Math.abs(b.getEast()-b.getWest()),zoom:map.getZoom()});}
map.on('moveend',region);
map.on('click',function(e){send({type:'tap',lat:e.latlng.lat,lon:e.latlng.lng});});
window.setPois=function(list){poiLayer.clearLayers();list.forEach(function(p){var ic=L.divIcon({className:'',iconSize:[28,28],iconAnchor:[14,14],html:'<div class="pin" style="background:'+p.color+'"><div class="dot"></div></div>'});var m=L.marker([p.lat,p.lon],{icon:ic});m.on('click',function(){send({type:'poi',id:p.id});});poiLayer.addLayer(m);});};
window.setMine=function(list){mineLayer.clearLayers();list.forEach(function(p){var ic=L.divIcon({className:'',iconSize:[28,28],iconAnchor:[14,14],html:'<div class="pin" style="background:#cf9a40"><div class="dot"></div></div>'});var m=L.marker([p.lat,p.lon],{icon:ic});m.on('click',function(){send({type:'mine',id:p.id});});mineLayer.addLayer(m);});};
window.setUser=function(lat,lon){if(lat==null)return;if(!userMarker){userMarker=L.marker([lat,lon],{icon:L.divIcon({className:'',iconSize:[16,16],iconAnchor:[8,8],html:'<div class="udot"></div>'})}).addTo(map);}else{userMarker.setLatLng([lat,lon]);}};
window.setTrack=function(c){if(track){map.removeLayer(track);track=null;}if(c&&c.length>1){track=L.polyline(c,{color:'#c4622f',weight:5}).addTo(map);}};
window.flyTo=function(lat,lon,z){map.setView([lat,lon],z||map.getZoom(),{animate:true});};
setTimeout(region,500);
true;
</script></body></html>`;

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
function dirWord(rel, de) {
  const a = ((rel % 360) + 540) % 360 - 180;
  const abs = Math.abs(a);
  if (abs <= 35) return de ? 'Vor dir' : 'Ahead of you';
  if (abs >= 145) return de ? 'Hinter dir' : 'Behind you';
  return a > 0 ? (de ? 'Rechts von dir' : 'To your right') : (de ? 'Links von dir' : 'To your left');
}

export default function MapScreen() {
  const webRef = useRef(null);
  const [webReady, setWebReady] = useState(false);
  const reqId = useRef(0);
  const lastMarkerTap = useRef(0);
  const regionRef = useRef(DEFAULT_REGION);
  const prevRegionRef = useRef(null);
  const poisRef = useRef([]);
  const lastLoaded = useRef(null);
  const zoomRef = useRef(14);

  const [pois, setPois] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('bereit');
  const [userLoc, setUserLoc] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState('de');
  const langRef = useRef('de');

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

  const safeInject = useCallback((js) => {
    try { if (webRef.current) webRef.current.injectJavaScript(js + '; true;'); } catch (e) {}
  }, []);

  // ---------- POIs laden ----------
  const loadForRegion = useCallback(async (region) => {
    const radius = Math.min(Math.max(Math.round((region.latitudeDelta / 2) * 111000), 200), 10000);
    const id = ++reqId.current;
    setLoading(true);
    setStatus('suche Orte …');
    try {
      const list = await fetchNearby(region.latitude, region.longitude, radius, langRef.current);
      if (id !== reqId.current) return;
      const withCat = list.map((p) => ({ ...p, cat: categorize(`${p.description} ${p.extract}`) }));
      setPois(withCat);
      poisRef.current = withCat;
      setStatus(withCat.length ? `${withCat.length} Orte in Sicht` : 'hier nichts gefunden');
    } catch (e) {
      if (id === reqId.current) setStatus('Daten nicht erreichbar');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForRegion(DEFAULT_REGION);
    lastLoaded.current = { ...DEFAULT_REGION, zoom: 14 };
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

  // ---------- Karten-Daten in die WebView spiegeln ----------
  useEffect(() => {
    if (webReady) safeInject('window.setPois&&window.setPois(' + JSON.stringify(pois.map((p) => ({ id: String(p.pageid), lat: p.lat, lon: p.lon, color: CATEGORY_COLORS[p.cat] || '#8a7d6a' }))) + ')');
  }, [pois, webReady, safeInject]);
  useEffect(() => {
    if (webReady) safeInject('window.setMine&&window.setMine(' + JSON.stringify(myPoints.map((p) => ({ id: String(p.id), lat: p.lat, lon: p.lon }))) + ')');
  }, [myPoints, webReady, safeInject]);
  useEffect(() => {
    if (webReady && userLoc) safeInject('window.setUser&&window.setUser(' + userLoc.latitude + ',' + userLoc.longitude + ')');
  }, [userLoc, webReady, safeInject]);
  useEffect(() => {
    if (webReady) safeInject('window.setTrack&&window.setTrack(' + JSON.stringify(trackCoords.map((c) => [c.latitude, c.longitude])) + ')');
  }, [trackCoords, webReady, safeInject]);

  // ---------- Nachrichten aus der WebView ----------
  const handleMessage = (e) => {
    let m;
    try { m = JSON.parse(e.nativeEvent.data); } catch (err) { return; }
    if (m.type === 'region') {
      zoomRef.current = m.zoom;
      const region = { latitude: m.lat, longitude: m.lon, latitudeDelta: m.latD, longitudeDelta: m.lonD };
      regionRef.current = region;
      const last = lastLoaded.current;
      if (last && distMeters(last, region) < 25 && Math.abs(m.zoom - (last.zoom != null ? last.zoom : m.zoom)) < 0.2) return;
      lastLoaded.current = { ...region, zoom: m.zoom };
      loadForRegion(region);
    } else if (m.type === 'tap') {
      if (placing) { addPointAt({ latitude: m.lat, longitude: m.lon }); return; }
      if (Date.now() - lastMarkerTap.current > 300) closeCard();
    } else if (m.type === 'poi') {
      const p = poisRef.current.find((x) => String(x.pageid) === String(m.id));
      if (p) selectPoi(p);
    } else if (m.type === 'mine') {
      const pt = myPoints.find((x) => String(x.id) === String(m.id));
      if (pt) { lastMarkerTap.current = Date.now(); setEditPoint({ ...pt }); }
    }
  };

  // ---------- Standort ----------
  const locate = async () => {
    setStatus('suche Standort …');
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') { setStatus('Standort verweigert'); return; }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    setUserLoc(loc);
    safeInject('window.flyTo&&window.flyTo(' + loc.latitude + ',' + loc.longitude + ',15)');
  };

  // ---------- POI auswählen / schließen ----------
  const selectPoi = (poi) => {
    lastMarkerTap.current = Date.now();
    if (!selected) prevRegionRef.current = regionRef.current;
    const r = regionRef.current;
    safeInject('window.flyTo&&window.flyTo(' + (poi.lat + r.latitudeDelta * 0.2) + ',' + poi.lon + ',' + (zoomRef.current || 15) + ')');
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

  const changeLang = (l) => { setLang(l); langRef.current = l; loadForRegion(regionRef.current); };

  // ---------- Eigene Punkte ----------
  const startPlacing = () => { setPlacing(true); setStatus('Tippe auf die Karte für einen Punkt'); };
  const addPointAt = (coord) => {
    setPlacing(false);
    setStatus('bereit');
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
    if (perm !== 'granted') { setStatus('Standort verweigert'); return; }
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

  // ---------- Kompass / Blickrichtung (nur für Sprachführung) ----------
  const updateHeadingWatch = async () => {
    const need = guideOnRef.current || headingUpRef.current;
    if (need && !headingSub.current) {
      try {
        headingSub.current = await Location.watchHeadingAsync((h) => {
          const deg = (h.trueHeading != null && h.trueHeading >= 0) ? h.trueHeading : h.magHeading;
          headingRef.current = deg;
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
  };

  // ---------- Guide ----------
  const announce = (poi, here) => {
    announcedRef.current.add(poi.pageid);
    busyRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const de = langRef.current === 'de';
    let lead = de ? 'In der Nähe ist' : 'Nearby is';
    if (headingRef.current != null && here) {
      const rel = bearing(here, { latitude: poi.lat, longitude: poi.lon }) - headingRef.current;
      lead = dirWord(rel, de);
    }
    Speech.stop();
    Speech.speak(
      de ? `${lead}: ${poi.title}. Möchtest du mehr wissen?` : `${lead}: ${poi.title}. Want to know more?`,
      { language: de ? 'de-DE' : 'en-US' }
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
    if (perm !== 'granted') { setStatus('Standort verweigert'); return; }
    setGuideOn(true); guideOnRef.current = true; announcedRef.current = new Set(); busyRef.current = false;
    const de = langRef.current === 'de';
    Speech.speak(
      de ? 'Guide aktiv. Ich melde mich, wenn etwas in der Nähe ist.' : 'Guide active. I will let you know when something is nearby.',
      { language: de ? 'de-DE' : 'en-US' }
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
      <WebView
        ref={webRef}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']}
        source={{ html: MAP_HTML }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        overScrollMode="never"
        onLoadEnd={() => setWebReady(true)}
        onMessage={handleMessage}
      />

      <View style={styles.statusChip}>
        {loading && <ActivityIndicator size="small" color={T.accent} style={{ marginRight: 7 }} />}
        <Text style={styles.statusText}>{placing ? 'Tippe auf die Karte …' : status}</Text>
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
          <Text style={styles.askSub}>{lang === 'de' ? 'Möchtest du mehr wissen?' : 'Want to know more?'}</Text>
          <View style={styles.askRow}>
            <TouchableOpacity style={[styles.askBtn, styles.askYes]} onPress={answerYes}>
              <Text style={styles.askYesTxt}>{lang === 'de' ? 'Ja, erzähl' : 'Yes'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.askBtn} onPress={answerNo}>
              <Text style={styles.askTxt}>{lang === 'de' ? 'Nein' : 'No'}</Text>
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

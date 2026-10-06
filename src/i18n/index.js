// src/i18n/index.js
// Zweisprachigkeit (Deutsch / Englisch) fuer die gesamte App.
//
// Eine einzige Sprache steuert drei Dinge:
//   1. alle Texte der Oberflaeche (dieses Modul),
//   2. die Wikipedia-Ausgabe (de.wikipedia.org / en.wikipedia.org),
//   3. die Stimme der Sprachausgabe (de-DE / en-US).
//
// Die Wahl wird lokal gespeichert; beim allerersten Start entscheidet die
// Systemsprache des Geraets. Bewusst ohne zusaetzliches Native-Modul
// (kein expo-localization), damit der bestehende Build unveraendert bleibt.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { NativeModules, Platform } from 'react-native';
import * as storage from '../services/storage';

export const LANGS = ['de', 'en'];
const STORAGE_KEY = 'wikiwalker.lang';

const STRINGS = {
  de: {
    'status.ready': 'bereit',
    'status.searching': 'suche Orte …',
    'status.found': '{n} Orte in Sicht',
    'status.none': 'hier nichts gefunden',
    'status.offline': 'Daten nicht erreichbar',
    'status.locating': 'suche Standort …',
    'status.locationDenied': 'Standort verweigert',
    'status.tapMap': 'Tippe auf die Karte für einen Punkt',
    'status.tapMapShort': 'Tippe auf die Karte …',

    'guide.ahead': 'Vor dir',
    'guide.behind': 'Hinter dir',
    'guide.right': 'Rechts von dir',
    'guide.left': 'Links von dir',
    'guide.nearby': 'In der Nähe ist',
    'guide.askSpeech': '{lead}: {title}. Möchtest du mehr wissen?',
    'guide.active': 'Guide aktiv. Ich melde mich, wenn etwas in der Nähe ist.',
    'ask.more': 'Möchtest du mehr wissen?',
    'ask.yes': 'Ja, erzähl',
    'ask.no': 'Nein',

    'poi.noPreview': 'Kein Vorschautext verfügbar.',
    'poi.loading': 'lädt …',
    'poi.readMore': 'Mehr lesen',
    'poi.onWikipedia': 'Auf Wikipedia',
    'poi.saved': 'Gemerkt ✓',
    'poi.save': 'Merken',

    'menu.locate': 'Standort finden',
    'menu.locateSub': 'Karte auf deine Position',
    'menu.saved': 'Gemerkte Orte',
    'menu.settings': 'Einstellungen',
    'menu.tourStop': 'Tour beenden',
    'menu.tourStart': 'Tour aufzeichnen',
    'menu.tourSubOn': 'Aufzeichnung läuft',
    'menu.tourSubOff': 'Weg & vorbeigegangene Orte',
    'menu.guide': 'Guide / Ansagen',
    'menu.guideOn': 'an – meldet Orte unterwegs',
    'menu.guideOff': 'aus',
    'menu.place': 'Eigener Punkt setzen',
    'menu.placeSub': 'Notiz, nur auf diesem Gerät',

    'saved.empty': 'Noch nichts gemerkt.\nTippe in einem Ort auf „Merken".',
    'saved.show': 'Auf Karte zeigen',
    'saved.remove': 'Entfernen',

    'settings.language': 'Sprache',
    'settings.languageSub': 'App und Wikipedia-Ausgabe',
    'settings.headingUp': 'Karte dreht mit',
    'settings.headingUpOn': 'an – Karte folgt deiner Blickrichtung',
    'settings.headingUpOff': 'aus – Norden oben',
    'settings.tours': 'Vergangene Touren',
    'settings.about': 'Über & Feedback',

    'tours.title': 'Vergangene Touren',
    'tours.empty': 'Noch keine Touren aufgezeichnet.\nStarte eine über „Tour aufzeichnen".',
    'tours.view': 'Ansehen',
    'tours.rename': 'Umbenennen',
    'tours.renameTitle': 'Route umbenennen',
    'tours.deleteTitle': 'Route löschen?',
    'tours.fallbackName': 'Route',

    'tour.yourTour': 'Deine Tour',
    'tour.duration': 'Dauer',
    'tour.distance': 'Strecke',
    'tour.places': 'Orte',
    'tour.emptyList': 'Unterwegs wurden keine Artikel-Orte erfasst.',

    'point.title': 'Eigener Punkt',
    'point.titlePlaceholder': 'Titel (z. B. Gitter am Marktplatz)',
    'point.notePlaceholder': 'Notiz fürs spätere Nachschauen …',

    'about.by': 'von Toni Marek',
    'about.version': 'Version {v}',
    'about.text': 'Entdecke Wikipedia-Orte in deiner Nähe – als Pins auf der Karte, beim Spazieren.',
    'about.feedback': 'Feedback senden',
    'about.support': 'Unterstütze freiwillig',
    'about.attr': 'Ortsdaten und Texte stammen aus Wikipedia, lizenziert unter CC BY-SA.',
    'mail.subject': 'wiki-walker Feedback',
    'mail.noApp': 'Keine Mail-App gefunden',
    'mail.noAppBody': 'Schreib gern direkt an {mail}.',

    'tip.title': 'Unterstütze freiwillig',
    'tip.intro': 'wiki-walker ist kostenlos und bleibt es. Wenn du magst, unterstütz die Weiterentwicklung mit einer Kleinigkeit.',
    'tip.tea': 'Tee',
    'tip.coffee': 'Kaffee',
    'tip.confirm': 'Bestätigen',
    'tip.pending': 'Wird verarbeitet …',
    'tip.done': 'Danke für deine Unterstützung! ☕️',
    'tip.error': 'Das hat leider nicht geklappt. Versuch es gern nochmal.',

    'common.cancel': 'Abbrechen',
    'common.save': 'Speichern',
    'common.delete': 'Löschen',
    'common.close': 'Schließen',
    'common.places': 'Orte',
  },

  en: {
    'status.ready': 'ready',
    'status.searching': 'looking for places …',
    'status.found': '{n} places in view',
    'status.none': 'nothing found here',
    'status.offline': 'data not reachable',
    'status.locating': 'looking for your location …',
    'status.locationDenied': 'location denied',
    'status.tapMap': 'Tap the map to place a point',
    'status.tapMapShort': 'Tap the map …',

    'guide.ahead': 'Ahead of you',
    'guide.behind': 'Behind you',
    'guide.right': 'To your right',
    'guide.left': 'To your left',
    'guide.nearby': 'Nearby is',
    'guide.askSpeech': '{lead}: {title}. Want to know more?',
    'guide.active': 'Guide active. I will let you know when something is nearby.',
    'ask.more': 'Want to know more?',
    'ask.yes': 'Yes, tell me',
    'ask.no': 'No',

    'poi.noPreview': 'No preview text available.',
    'poi.loading': 'loading …',
    'poi.readMore': 'Read more',
    'poi.onWikipedia': 'On Wikipedia',
    'poi.saved': 'Saved ✓',
    'poi.save': 'Save',

    'menu.locate': 'Find my location',
    'menu.locateSub': 'Center the map on you',
    'menu.saved': 'Saved places',
    'menu.settings': 'Settings',
    'menu.tourStop': 'Stop tour',
    'menu.tourStart': 'Record a tour',
    'menu.tourSubOn': 'Recording in progress',
    'menu.tourSubOff': 'Your route and the places you pass',
    'menu.guide': 'Guide / announcements',
    'menu.guideOn': 'on – announces places along the way',
    'menu.guideOff': 'off',
    'menu.place': 'Add your own point',
    'menu.placeSub': 'A note, kept on this device only',

    'saved.empty': 'Nothing saved yet.\nOpen a place and tap "Save".',
    'saved.show': 'Show on map',
    'saved.remove': 'Remove',

    'settings.language': 'Language',
    'settings.languageSub': 'App and Wikipedia edition',
    'settings.headingUp': 'Map rotates with you',
    'settings.headingUpOn': 'on – map follows the way you face',
    'settings.headingUpOff': 'off – north up',
    'settings.tours': 'Past tours',
    'settings.about': 'About & feedback',

    'tours.title': 'Past tours',
    'tours.empty': 'No tours recorded yet.\nStart one via "Record a tour".',
    'tours.view': 'View',
    'tours.rename': 'Rename',
    'tours.renameTitle': 'Rename route',
    'tours.deleteTitle': 'Delete route?',
    'tours.fallbackName': 'Route',

    'tour.yourTour': 'Your tour',
    'tour.duration': 'Duration',
    'tour.distance': 'Distance',
    'tour.places': 'Places',
    'tour.emptyList': 'No article places were recorded along the way.',

    'point.title': 'Your own point',
    'point.titlePlaceholder': 'Title (e.g. gate on the market square)',
    'point.notePlaceholder': 'A note to look up later …',

    'about.by': 'by Toni Marek',
    'about.version': 'Version {v}',
    'about.text': 'Discover Wikipedia places around you – as pins on the map, while you walk.',
    'about.feedback': 'Send feedback',
    'about.support': 'Leave a tip',
    'about.attr': 'Place data and texts come from Wikipedia, licensed under CC BY-SA.',
    'mail.subject': 'wiki-walker feedback',
    'mail.noApp': 'No mail app found',
    'mail.noAppBody': 'Feel free to write directly to {mail}.',

    'tip.title': 'Leave a tip',
    'tip.intro': 'wiki-walker is free and stays free. If you like it, you can support its development with something small.',
    'tip.tea': 'Tea',
    'tip.coffee': 'Coffee',
    'tip.confirm': 'Confirm',
    'tip.pending': 'Processing …',
    'tip.done': 'Thank you for your support! ☕️',
    'tip.error': 'That did not work, unfortunately. Please try again.',

    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.places': 'places',
  },
};

// Systemsprache des Geraets. Erst Intl (Hermes), dann die Native-Module als
// Rueckfallebene. Alles ausser Deutsch bekommt Englisch.
function deviceLang() {
  let tag = '';
  try {
    tag = Intl.DateTimeFormat().resolvedOptions().locale || '';
  } catch (e) { /* Intl nicht verfuegbar */ }
  if (!tag) {
    try {
      if (Platform.OS === 'ios') {
        const s = (NativeModules.SettingsManager && NativeModules.SettingsManager.settings) || {};
        tag = s.AppleLocale || (Array.isArray(s.AppleLanguages) ? s.AppleLanguages[0] : '') || '';
      } else {
        tag = (NativeModules.I18nManager && NativeModules.I18nManager.localeIdentifier) || '';
      }
    } catch (e) { /* egal */ }
  }
  return String(tag).toLowerCase().startsWith('de') ? 'de' : 'en';
}

// Uebersetzt einen Schluessel. Platzhalter der Form {name} werden ersetzt.
export function translate(lang, key, params) {
  const table = STRINGS[lang] || STRINGS.de;
  let s = table[key];
  if (s == null) s = STRINGS.de[key];
  if (s == null) return key;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, name) => (params[name] != null ? String(params[name]) : m));
}

export const localeOf = (lang) => (lang === 'de' ? 'de-DE' : 'en-US');
export const wikiHost = (lang) => (lang === 'de' ? 'de.wikipedia.org' : 'en.wikipedia.org');

// Entfernungsangabe – im Deutschen mit Komma, im Englischen mit Punkt.
export function formatKm(meters, lang) {
  const v = (meters / 1000).toFixed(1);
  return (lang === 'de' ? v.replace('.', ',') : v) + ' km';
}

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(deviceLang);

  useEffect(() => {
    storage.getItem(STORAGE_KEY, null).then((saved) => {
      if (saved === 'de' || saved === 'en') setLangState(saved);
    });
  }, []);

  const setLang = useCallback((l) => {
    if (l !== 'de' && l !== 'en') return;
    setLangState(l);
    storage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo(() => ({
    lang,
    setLang,
    t: (key, params) => translate(lang, key, params),
    locale: localeOf(lang),
    km: (m) => formatKm(m, lang),
  }), [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LangContext);
  if (ctx) return ctx;
  // Rueckfallebene, falls eine Komponente ausserhalb des Providers gerendert wird.
  return {
    lang: 'de',
    setLang: () => {},
    t: (key, params) => translate('de', key, params),
    locale: 'de-DE',
    km: (m) => formatKm(m, 'de'),
  };
}

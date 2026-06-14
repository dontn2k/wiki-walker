// src/services/wiki.js
// Zugriff auf die Wikipedia-APIs – dieselbe Logik wie in der Web-Version.

function qs(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

// Wikimedia verlangt einen aussagekräftigen User-Agent – sonst werden Anfragen
// (z. B. mit Androids OkHttp-Standard-UA) mit 403 abgewiesen.
const WIKI_HEADERS = {
  'User-Agent': 'wiki-walker/1.0 (https://github.com/dontn2k/wiki-walker; tmarek@gmx.net)',
  'Api-User-Agent': 'wiki-walker/1.0 (https://github.com/dontn2k/wiki-walker; tmarek@gmx.net)',
  Accept: 'application/json',
};
export const WIKI_UA = 'wiki-walker/1.0 (https://github.com/dontn2k/wiki-walker; tmarek@gmx.net)';

// Orte mit Artikel im Umkreis (Geosearch + Kurzbeschreibung + Bild + erster Satz, in einem Aufruf).
export async function fetchNearby(lat, lon, radius, lang = 'de') {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?` +
    qs({
      action: 'query', format: 'json', formatversion: '2',
      generator: 'geosearch', ggscoord: `${lat}|${lon}`, ggsradius: String(radius), ggslimit: '50',
      prop: 'coordinates|pageimages|description|extracts',
      exintro: '1', explaintext: '1', exsentences: '1',
      piprop: 'thumbnail', pithumbsize: '320',
    });

  const res = await fetch(url, { headers: WIKI_HEADERS });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const pages = (data && data.query && data.query.pages) || [];
  return pages
    .filter((p) => p.coordinates && p.coordinates[0])
    .map((p) => ({
      pageid: p.pageid,
      title: p.title,
      lat: p.coordinates[0].lat,
      lon: p.coordinates[0].lon,
      description: p.description || '',
      extract: p.extract || '',
      thumbnail: (p.thumbnail && p.thumbnail.source) || null,
    }));
}

// Voller Einleitungstext + Artikel-Link für „Mehr lesen".
export async function fetchSummary(title, lang = 'de') {
  const res = await fetch(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { headers: WIKI_HEADERS }
  );
  const d = await res.json();
  return {
    extract: d.extract || '',
    url:
      (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) ||
      `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  };
}

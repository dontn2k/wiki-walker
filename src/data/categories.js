// src/data/categories.js
// Erkennt grob die Art eines Orts aus der Wikidata-Kurzbeschreibung / dem ersten Satz
// und liefert Farbe + MaterialCommunityIcons-Name für den Karten-Pin.

export const CATEGORY_COLORS = {
  church: '#8b5cf6', water: '#2f8fd0', castle: '#9a5b1e', train: '#586072',
  museum: '#b8456c', bridge: '#10796f', mountain: '#2f7d3a', town: '#8a7d68',
  monument: '#b07d18', dot: '#c4622f',
};

// MaterialCommunityIcons-Namen (in @expo/vector-icons enthalten). dot = einfacher Punkt.
export const CATEGORY_ICONS = {
  church: 'church', water: 'waves', castle: 'castle', train: 'train',
  museum: 'bank', bridge: 'bridge', mountain: 'terrain', town: 'home-city',
  monument: 'fountain', dot: null,
};

export function categorize(text) {
  const t = (text || '').toLowerCase();
  const has = (...w) => w.some((x) => t.includes(x));
  if (has('kirche', 'kapelle', 'münster', 'dom ', 'cathedral', 'church', 'chapel', 'basilika', 'kloster', 'abbey', 'monastery')) return 'church';
  if (has('fluss', 'bach', 'see', 'teich', 'weiher', 'wasserfall', 'river', 'stream', 'lake', 'reservoir', 'waterfall', 'pond', 'quelle')) return 'water';
  if (has('burg', 'schloss', 'festung', 'ruine', 'palast', 'castle', 'fortress', 'palace', 'ruin', 'manor')) return 'castle';
  if (has('bahnhof', 'haltepunkt', 'railway', 'train station')) return 'train';
  if (has('museum', 'galerie', 'gallery', 'sammlung')) return 'museum';
  if (has('brücke', 'bridge', 'viadukt', 'viaduct')) return 'bridge';
  if (has('berg', 'gipfel', 'spitze', 'pass', 'alp', 'mountain', 'peak', 'summit', 'hill', 'hügel')) return 'mountain';
  if (has('gemeinde', 'dorf', 'stadt', 'ortsteil', 'weiler', 'municipality', 'village', 'town', 'quarter', 'hamlet', 'district')) return 'town';
  if (has('denkmal', 'mahnmal', 'statue', 'monument', 'memorial', 'brunnen', 'fountain', 'säule')) return 'monument';
  return 'dot';
}

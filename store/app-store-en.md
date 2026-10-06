# wiki-walker — App Store Connect, englische Lokalisierung

Vorlage für die Sprache **English (U.S.)** in App Store Connect. Alle Felder sind zum
direkten Einfügen vorbereitet; die Zeichenzahlen stehen jeweils in Klammern und sind
gegen die von Apple vorgegebenen Obergrenzen geprüft.

Vorgeschlagene Versionsnummer für den Release: **1.1.0** (neues Funktionsmerkmal, kein
reiner Fehlerbehebungs-Release).

---

## 1. App-Name

Bleibt in beiden Sprachen identisch:

```
wiki-walker
```

(11 von 30 Zeichen)

---

## 2. Untertitel (Subtitle)

```
Wikipedia places around you
```

(27 von 30 Zeichen)

---

## 3. Werbetext (Promotional Text)

Das englische Gegenstück zum bestehenden deutschen Werbetext. Dieses Feld lässt sich
jederzeit ohne neue Einreichung ändern.

```
Everything straight from Wikipedia, free and without ads. Discover the history behind the places around you.
```

(108 von 170 Zeichen)

---

## 4. Beschreibung (Description)

```
wiki-walker turns Wikipedia into a map. Wherever you are, it shows you the articles written about the places around you — as pins you can tap while you walk.

No account, no ads, no tracking. Everything comes live from Wikipedia.


PLACES ON THE MAP

Churches, castles, bridges, museums, mountains, monuments and more, each with its own color and symbol. Move or zoom the map and wiki-walker looks again.


READ AS YOU GO

Tap a pin for a picture, a short description and the opening lines of the article. "Read more" opens the full introduction, and one more tap takes you to Wikipedia itself.


AUDIO GUIDE

Switch the guide on and put your phone away. When you come close to a place, wiki-walker tells you where it is — ahead of you, to your right, behind you — and asks whether you want to hear more.


RECORD A TOUR

Start a recording and your route is drawn on the map. When you stop, you get the time, the distance and every article place you walked past. Past tours are kept, and you can rename them.


YOUR OWN POINTS

Mark anything the map does not know about and add a note to look up later. Your points stay on your device.


SAVED PLACES

Keep the ones you want to come back to.


GERMAN AND ENGLISH

One switch changes three things at once: the app, the Wikipedia edition it reads from and the voice of the audio guide.


FREE, AND STAYING FREE

wiki-walker costs nothing and no function is locked away. If you would like to support its development, there is a small optional tip inside the app.


Place data and texts come from Wikipedia, licensed under CC BY-SA. An internet connection is required.
```

(1.614 von 4.000 Zeichen)

---

## 5. Schlüsselbegriffe (Keywords)

Kommagetrennt, ohne Leerzeichen. Begriffe aus App-Name und Untertitel sind bewusst nicht
wiederholt, da Apple diese bereits indexiert. "offline" wurde bewusst ausgelassen, da die
App eine Internetverbindung benötigt.

```
nearby,history,landmark,sightseeing,audioguide,walking,tour,explore,city,culture,museum,castle
```

(94 von 100 Zeichen)

---

## 6. Neue Funktionen (What's New)

### English (U.S.)

```
wiki-walker now speaks English.

• A new language setting switches the app, the Wikipedia edition it reads from and the voice of the audio guide, all at once.
• On first launch the app follows your device language; your choice is remembered from then on.
• Distances and dates are now shown in the format of the selected language.
```

(330 Zeichen)

### Deutsch

```
wiki-walker spricht jetzt auch Englisch.

• Eine neue Spracheinstellung schaltet die Oberfläche, die Wikipedia-Ausgabe und die Stimme des Guides gemeinsam um.
• Beim ersten Start richtet sich die App nach der Systemsprache; die eigene Wahl bleibt danach erhalten.
• Entfernungen und Datumsangaben erscheinen nun im Format der gewählten Sprache.
```

(344 Zeichen)

---

## 7. In-App-Käufe

Die beiden Trinkgeld-Produkte benötigen eine eigene englische Lokalisierung. Diese wird je
Produkt unter *Monetization → In-App Purchases* gepflegt.

| Produkt-ID | Feld | Deutsch | English (U.S.) |
|---|---|---|---|
| `tip_tea_1` | Anzeigename (max. 30) | Tee | Tea |
| `tip_tea_1` | Beschreibung (max. 45) | Ein kleines Dankeschön | A small thank you |
| `tip_coffee_4` | Anzeigename (max. 30) | Kaffee | Coffee |
| `tip_coffee_4` | Beschreibung (max. 45) | Ein größeres Dankeschön | A bigger thank you |

---

## 8. Bildschirmfotos (Screenshots)

Bildschirmfotos werden je Sprache getrennt geführt. Für die englische Lokalisierung wird
daher ein eigener Satz benötigt, aufgenommen mit der App in englischer Einstellung.

Erforderliche Größen, da `supportsTablet` aktiv ist:

| Gerät | Auflösung | Anzahl |
|---|---|---|
| iPhone 6.9" | 1290 × 2796 | mindestens 1, bis zu 10 |
| iPad 13" | 2064 × 2752 | mindestens 1, bis zu 10 |

Empfohlene Motive, in dieser Reihenfolge:

1. Karte mit mehreren Kategorie-Pins
2. Geöffnete Ortskarte mit Bild und Text
3. Aktiver Guide mit der Rückfrage
4. Tourzusammenfassung nach einer Aufzeichnung
5. Einstellungen mit dem Sprachumschalter

---

## 9. Weitere Felder

| Feld | Wert |
|---|---|
| Primäre Sprache | Deutsch (unverändert) |
| Zusätzliche Lokalisierung | English (U.S.) |
| Support-URL | Sollte eine englische Fassung erhalten oder zumindest zweisprachig sein |
| Kategorie, Altersfreigabe, Datenschutzangaben | unverändert, gelten sprachübergreifend |

---

## 10. Ablauf in App Store Connect

1. Aktualisierte Fassung der Developer Program License Agreement bestätigen, sofern noch offen.
2. Neue Version 1.1.0 anlegen.
3. Unter *App-Informationen* die Lokalisierung **English (U.S.)** hinzufügen.
4. Felder aus den Abschnitten 1 bis 6 einfügen.
5. Englische Bildschirmfotos hochladen (Abschnitt 8).
6. Englische Lokalisierung der beiden In-App-Käufe ergänzen (Abschnitt 7).
7. Build hochladen und zur Prüfung einreichen.

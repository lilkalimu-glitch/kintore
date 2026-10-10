# Nächste Version von KINTORE

Stand: 10. Oktober 2026. Aktuelle Version: 2.8 (Release v2.8). Darin steckt der ganze Plan 2.7: einfache Bedienung,
eigene Knöpfe, volleres Profil und 9 neue Banner nach Vorlagen des Besitzers. Die Nummer der APK zählt jeden Build mit,
deshalb heißt sie 2.8.

Der Plan unten ist am 10. Oktober 2026 mit dem Besitzer abgestimmt. Er kommt in drei Schritten, jeder Schritt endet
mit einer eigenen APK zum Testen: erst Schritt 1, dann 2, dann 3. Erledigtes abhaken, nicht löschen.

## Warum

Rückmeldungen zu Version 2.8 aus dem Umfeld des Besitzers: Manche Knöpfe sehen immer noch nach KI aus, die App
reagiert etwas verzögert, und für die japanischen Zeichen wurde er ausgelacht. Er will deshalb eine schnellere App,
ein deutlich erweitertes Profil und ein Design, das wie eine Store-App wirkt und nicht kitschig. Designs und Sprache
sollen umstellbar sein, Werte beim Eintragen und im Profil realistisch. Claude sollte außerdem überlegen, was im
Vergleich zu Store-Apps fehlt. Das Ergebnis steht für später in `fahrplan.md` unter "Funktionen wie in Store-Apps".

## Noch offen

- [ ] Entwürfe: Nach der Tempo-APK 2 bis 3 Seiten im neuen Standard-Design als Entwurf zeigen, zum Beispiel Start,
      Training und Profil. Der Besitzer bestätigt Akzentfarbe, Schrift und Knöpfe. Erst danach die ganze App umbauen.

## Schritt 1: Schnell und erwachsen

### Tempo (zuerst, als eigene APK noch im alten Look)

- [ ] Jede Reaktion auf Antippen braucht unter 0,1 Sekunden, der Rang-Pfad öffnet in unter 0,3 Sekunden, Scrollen
      läuft flüssig. Gemessen mit `.claude/tests/tempo.py`, Ausgangswerte unter "Hinweise für den Bau".
- [ ] Nach einer Änderung wird nur neu gezeichnet, was sich wirklich ändert, nicht die ganze Seite.
- [ ] Rang-Pfad: Nur die Stationen zeichnen, die man sieht oder gleich sieht. Animationen laufen nur, solange sie
      zu sehen sind.
- [ ] Look-Fenster: Vorschau und Auswahl nur für den offenen Reiter bauen.
- [ ] Satz speichern bleibt auch mit Jahren an Verlauf schnell: nur nachrechnen, was sich geändert hat.
- [ ] Sichern läuft im Hintergrund, die App stockt dabei nie, auch nicht auf dem Handy mit der Datei-Kopie.

### Neues Standard-Design wie eine Store-App

- [ ] Ruhiger dunkler Grund, flache Karten, eine Akzentfarbe, gerade klare Schrift ohne kursive Titel. Kein Glas,
      kein Leuchten, keine Farbverläufe.
- [ ] Neue Knöpfe: normal abgerundet, der Hauptknopf in der Akzentfarbe, die anderen grau. Keine abgeschrägten
      Ecken mehr im Standard.
- [ ] Alle Symbole aus einem einheitlichen Satz, gleiche Strichstärke und Größe.
- [ ] Alle Seiten und Fenster umbauen, nicht nur einzelne: Start, Training, Übungen, Verlauf, Körper, Einstellungen,
      Rang-Pfad, Profil, alle Fenster, Hinweise, Einführung und die Effekte beim Abholen.
- [ ] Level, Rang, Rang-Pfad und Belohnungen bleiben, nur ruhiger dargestellt, zum Beispiel mit flachem
      Rang-Abzeichen statt Leucht-Sechseck.
- [ ] Neues App-Symbol und Startbild ohne Kanji und ohne Glitzer-Stern.

### Japanische Zeichen

- [ ] Im Standard keine japanischen Zeichen mehr: kein Neon-Schild auf der Startseite, keine Zeichen hinter den
      Überschriften, kein 休息日 neben Ruhetag, kein 筋 als Platzhalter.
- [ ] Ohne Foto zeigt das Profilbild die Initialen.
- [ ] Der Name KINTORE bleibt, in lateinischer Schrift.
- [ ] Neon-Schilder gibt es zusätzlich mit einem Wort statt Schriftzeichen, zum Beispiel DISZIPLIN.
- [ ] Belohnungen mit Kanji (Neon-Schilder, einige Banner) bleiben im Rang-Pfad. Man muss sie nicht tragen.

### Designs zum Wählen

- [ ] In den Einstellungen: Dunkel (neu, Standard), Hell und Neon (der bisherige Look).
- [ ] Im Design Neon lassen sich die japanischen Zeichen wieder einschalten.
- [ ] Die Farben aus dem Rang-Pfad gelten in jedem Design als Akzentfarbe.

## Schritt 2: Profil und realistische Werte

### Profil

- [ ] Angaben zur Person, alle freiwillig und ausblendbar: Größe, Alter, Geschlecht, Ziel (zum Beispiel Muskelaufbau
      oder Kraft), Erfahrung, Trainingstage pro Woche und seit wann man trainiert.
- [ ] Stärke-Einordnung: Bei Bankdrücken, Kniebeuge, Kreuzheben und weiteren Hauptübungen sieht man, wo man im
      Verhältnis zum Körpergewicht steht, von Anfänger bis Elite.
- [ ] Muskel-Karte: Körper von vorn und hinten, zeigt, welche Muskeln diese Woche trainiert wurden.
- [ ] Erfolge: viele kleine Meilensteine, zum Beispiel 100 Trainings, 1.000 Sätze oder 100 kg Bankdrücken.
- [ ] Mehr Statistik: Trainings pro Woche, Dauer und Volumen pro Muskelgruppe.
- [ ] Profil als Bild teilen, zum Beispiel in WhatsApp oder Instagram.

### Realistische Werte

- [ ] Eingaben prüfen: Sieht ein Wert unrealistisch aus, fragt die App kurz nach, zum Beispiel bei 250 kg für Curls,
      80 Wiederholungen oder 15 kg mehr Körpergewicht als beim letzten Eintrag. Das gilt überall gleich: Training,
      Satz ändern, Körper und Einstellungen. Heute gehen beim Satz ändern sogar 5.000 kg oder 0 Wiederholungen durch.
- [ ] Passende Startwerte: Eine Übung ohne Verlauf schlägt ein Gewicht vor, das zu Übung, Körpergewicht und
      Erfahrung passt, statt immer 20 kg.

### Einrichtung beim ersten Start

- [ ] Kurz und überspringbar: Name, Ziel, Erfahrung und Körperdaten. Später im Profil änderbar.

## Schritt 3: Sprachen

- [ ] Deutsch, Englisch und Türkisch. Die App startet in der Sprache vom Handy und lässt sich in den Einstellungen
      umstellen.
- [ ] Übersetzt werden alle Texte, Muskelgruppen, Belohnungen, Datum und Zahlen. Übungsnamen bleiben, wie sie sind.

## Geklärt

- Am 10. Oktober 2026 mit dem Besitzer geklärt: Reihenfolge Tempo, Design, Profil, Sprachen. Das Design kommt vor
  dem Profil, damit das neue Profil nicht zweimal gebaut wird.
- Realistische Werte heißt: Eingaben prüfen, passende Startwerte und Körperdaten fürs Profil.
- Sprachen: Deutsch, Englisch und Türkisch.
- Japanische Zeichen: im Standard keine, im Design Neon wieder einschaltbar.

## Hinweise für den Bau

Gemessen am 10. Oktober 2026 mit `python3 .claude/tests/tempo.py`, Prozessor 4-fach gedrosselt wie bei einem
Mittelklasse-Handy, mehrere Läufe. Daten aus `beispieldaten.py 85` und `beispieldaten.py 1100`:

| Aktion | 816 Sätze | 10.608 Sätze (3 Jahre) |
|---|---|---|
| Start bis die Seite steht | 0,45-1,0 s | 0,65-0,95 s |
| Rang-Pfad öffnen | 1,1-1,3 s | 1,0-1,2 s |
| Look-Fenster öffnen | 0,4 s | 0,3-0,4 s |
| Training starten | 0,1-0,17 s | 0,19-0,25 s |
| Satz speichern | 0,07-0,17 s | 0,11-0,35 s |
| Profil öffnen | 0,1-0,22 s | 0,1-0,16 s |
| Tab Körper | 0,14 s | 0,11-0,13 s |
| Andere Tabs, Plus und Minus, Muskelgruppe | unter 0,1 s | unter 0,1 s |

- Rang-Pfad: knapp 3.000 Elemente auf einmal, 255-297 laufende Animationen, rund 240 Schatten und 70 Leuchtschriften.
  Profil: 378 Elemente und 55-68 Animationen.
- `render()` in `www/js/core.js` baut nach jeder Änderung die ganze Seite neu. `derive()` in `www/js/stats.js`
  rechnet nach jeder Änderung den ganzen Verlauf neu (3 Jahre: etwa 25 ms pro Durchlauf, gedrosselt).
- Grafik, die der Test nicht misst, die auf Android aber viel kostet: `backdrop-filter` auf jeder `.card`, auf
  `#tabs`, `#timer` und `.sheet-backdrop`, über 100 Schatten mit Leuchten, Leuchtschrift (`text-shadow`) und
  Endlos-Animationen, die bei jedem Bild neu malen (`dot-pulse`, `flow`, `holo`, `sign-on`). Auch im Design Neon die
  Unschärfe durch fast deckende Flächen ersetzen.
- Sichern: Im Browser blieb nach dem Speichern jede Blockade unter 50 ms. Auf dem Handy kommt die Datei-Kopie über
  Capacitor dazu (`mirrorWrite` in `www/js/store.js`, der ganze Stand als Text, bei 3 Jahren etwa 620 KB). Das auf
  dem Gerät prüfen.
- Designs über CSS-Variablen und `:root[data-theme]`, die Akzentfarbe bleibt in `--acc*`. Neue Einstellungen
  (Design, japanische Zeichen) in `state.settings` und in `migrate()` abfangen.
- Nach dem Umbau den Abschnitt Design in `.claude/CLAUDE.md` neu schreiben: Der neue Look ist der Standard, Neon ist
  eines von drei Designs. Die Regeln aus `docs/bedienung.md` gelten weiter. `bedienung.py` für jedes Design laufen
  lassen, im hellen Design besonders auf Kontrast achten.
- Teilen: `@capacitor/share` ist schon eingebunden. Das Bild fürs Profil selbst als SVG zeichnen und über ein Canvas
  in ein PNG umwandeln.
- Stärke-Richtwerte als eigene Tabelle (Verhältnis zum Körpergewicht, nach Geschlecht), keine Tabellen von anderen
  Seiten übernehmen. Die Maßstäbe in `www/js/scale.js` sind ein Anfang.
- Neue Profilfelder in `state.profile`, immer in `migrate()` abfangen. Keine echten Körperdaten committen.
- Sprachen: In den Schriften fehlen ğ, Ğ, İ, ş und Ş. Vor Schritt 3 `scripts/build-fonts.py` erweitern und die
  Schriften neu bauen. Texte in Wörterbücher ziehen, Datum und Zahlen über `Intl` in der gewählten Sprache. Die
  Regeln für Texte in der App gelten in jeder Sprache.

## Erledigt in Version 2.7

Ziel war: Die App soll für jeden einfach zu bedienen sein und dabei hochwertig aussehen. Das Profil soll voll
wirken, und man soll sofort verstehen, wo man was findet und ändert. Der Neon-Anime-Stil bleibt und wird besser.

### 1. Eigene Knöpfe statt Standard-Look

- [x] Die Knöpfe unten im Profil (Bearbeiten, Look) und ähnliche Knöpfe in der App sehen zu sehr nach typischer
      KI-App aus. Sie bekommen einen eigenen KINTORE-Stil.
- [x] Eckige Neon-Knöpfe mit abgeschrägten Ecken wie in einem Game-Menü, ohne Glitzer-Symbol.
- [x] Bearbeiten als kleiner Stift direkt am Profilbild statt eines großen Knopfs.
- [x] Weniger Glas: Ein Kollege fand die glasartigen Knöpfe übertrieben. Knöpfe sehen normaler und ruhiger aus,
      ohne dicken Glanz und ohne buntes Leuchten darunter. Das betrifft vor allem den großen Hauptknopf
      (zum Beispiel Speichern, Anlegen, Training beenden) und die durchsichtigen Knöpfe daneben.

### 2. Profil voller

- [x] Das Profil soll nicht leer wirken, die Effekte sollen mehr zu sehen sein.
- [x] Größerer Banner und Effekte über die ganze Profilkarte statt nur ums Profilbild.
- [x] Abzeichen unter dem Namen, zum Beispiel Rang, Serie und Rekorde.
- [x] Neon-Kalender mit den letzten Trainingswochen.

### 3. Klar, wo was ist

- [x] Man versteht sofort, wo man was findet und ändert.
- [x] Banner, Rahmen, Effekt und die anderen Teile vom Look lassen sich direkt im Profil antippen und ändern.
- [x] Kurze Einführung für Profil und Rang-Pfad: nur beim ersten Öffnen, wenige kurze Schritte, überspringbar.

### 4. Banner nach Vorlagen des Besitzers

- [x] Neue Banner im Stil der Referenzbilder, die der Besitzer schickt.

### 5. Nichts springt zurück

- [x] Nach dem Antippen bleibt man genau da, wo man war. Keine Leiste, keine Liste und kein Fenster springt an den
      Anfang zurück oder baut sich sichtbar neu auf.
- [x] Gefunden: Unter Übungen springt die Leiste mit den Muskelgruppen nach dem Antippen wieder an den Anfang.
      Beim Bearbeiten einer Vorlage baut sich das Fenster nach jedem Antippen neu auf.
- [x] Alle Seiten und Fenster darauf durchgehen, nicht nur die gefundenen Stellen.

### 6. Klare Rückmeldung

- [x] Nach jeder Aktion sieht man klar, dass sie geklappt hat.
- [x] Körpergewicht: Ist das heutige Gewicht eingetragen, sieht man das auf der Seite, nicht nur kurz als Hinweis.
      Man erkennt also jederzeit, dass für heute schon etwas drin ist.

### 7. Für jeden einfach zu bedienen

- [x] Vor dem Bauen gründlich und professionell recherchieren, wie man eine App wirklich benutzerfreundlich baut:
      Richtlinien von Google und Apple, Regeln für Barrierefreiheit (WCAG) und bewährte Usability-Regeln.
      Daraus eine kurze Liste mit Regeln für KINTORE machen und die ganze App danach prüfen.
- [x] Die App ist so einfach, dass wirklich jeder sie ohne Erklärung versteht, auch ohne Technik-Erfahrung
      oder mit Einschränkungen, zum Beispiel beim Sehen oder beim Tippen.
- [x] Der Stil bleibt erhalten und wird dabei verbessert.

### Geklärt

- Referenzbilder: 9 Bilder vom Besitzer (rote Pinselschrift, Auge, Manga-Seite, Lava-Palast, Ritter mit
  Finsternis, Feuerwirbel, Lichtstrahl, Klinge im Regen, Schwarzes Loch). Am 10. Oktober 2026 mit ihm geklärt:
  9 Banner, eins pro Bild, verteilt ab Level 15. Je höher, desto besonderer, ab Rang A bewegt.
  Figuren aus den Bildern werden nicht nachgezeichnet, übernommen sind Stimmung, Farben und Motive.

### Hinweise aus Version 2.7

- Regeln für die Bedienung: `docs/bedienung.md`. Neue Ansichten und Knöpfe danach bauen und mit
  `python3 .claude/tests/bedienung.py <state.json>` prüfen.
- Neue Banner (nur SVG und CSS, in `www/js/banners.js`): Tusche 15, Klinge 19, Manga-Panel 22, Himmelslicht 28,
  Finsternis 33 (selten, stehen still), Das Auge 40, Unterwelt 48 (episch, bewegt), Schwarzes Loch 60,
  Feuersturm 65 (legendär). Wer schon weiter ist, kann sie nach dem Update gleich im Rang-Pfad abholen.
  Kanji und Katakana darin sind Pfade aus Noto Serif CJK und Noto Sans CJK, dafür war kein neuer Schriftbau nötig.
- Knöpfe: `.btn-neon` (Hauptknopf, gefüllt, dunkle Schrift), `.btn-ghost` (Rand), `.btn-danger` (Löschen),
  `.btn-dashed` (Hinzufügen). Die abgeschrägte Form zeichnen `::before` und `::after`, der Knopf bleibt ein
  Rechteck und damit voll antippbar. Kleine Knöpfe bekommen unsichtbar mehr Tippfläche über `::after`.
- Nichts springt (`www/js/core.js`): Leisten mit `data-keep` behalten ihre Position, der angetippte Knopf bleibt
  an seiner Stelle (gilt nicht für Knöpfe mit `data-anchor="none"`, zum Beispiel "Ältere anzeigen"),
  Deko mit `data-persist` wird beim Neuzeichnen übernommen, damit Animationen weiterlaufen. `openSheet` tauscht
  in einem offenen Fenster nur den Inhalt (`keep` behält die Scroll-Position) und gibt `.sheet-body` zurück.
- Profil: Banner 184 px hoch, Effekte haben jetzt einen Teil `card` für die ganze Karte (`www/js/art.js`).
  Neuer Profil-Teil `calendar` (Trainingstage der letzten 16 Wochen, ausblendbar).
- Look ändern: ein Fenster mit Vorschau (Mini-Profil) und Reitern für die sechs Teile (`lookSheet(type)`).
- Einführung: `www/js/intro.js`, gesehen steht in `state.meta.intro` (`profil`, `rang`).
- Körper: Ist heute eingetragen, steht das dauerhaft auf der Karte zum Eintragen.
- Android: Größere Schrift aus den Android-Einstellungen gilt jetzt auch in der App, höchstens 130 %
  (`scripts/patch-android.py`). Vorher war die Schriftgröße fest.

## Erledigt in Version 2.6

Ziel war: Freischaltungen sollen sich wirklich besonders anfühlen.

### Belohnungen nach Rang

- [x] Je höher der Rang, desto besonderer sehen die Belohnungen aus.
- [x] Jede Belohnung zeigt, aus welchem Rang sie kommt.
- [x] Seltenheitsstufen: Normal, Selten, Episch, Legendär. Ab Episch sind Belohnungen animiert,
      Legendär bekommt Effekte wie Neon-Flammen oder Funken.

### XP nach Gewicht, fair pro Übung

- [x] In jeder Übung gilt: mehr Gewicht und mehr Volumen bringen mehr XP.
- [x] Jede Übung hat ihren eigenen Maßstab mit typischen Werten, damit Beinpresse und Curls gleich fair sind.
- [x] Wer stärker ist, bekommt mehr XP.

### Profil

- [x] Eigenes Profil, auf dem alles Freigeschaltete zu sehen ist: Banner, Avatar-Rahmen, glänzende Farben
      und Effekte wie Neon-Flammen.
- [x] Antippen zeigt das Profil, ähnlich wie bei Discord.
- [x] Die Belohnungen aus dem Rang-Pfad werden direkt Teile vom Profil.
- [x] Aufs Profil kommen außerdem Profilbild, Name, Level und Rang sowie Bestwerte. Der Besitzer wollte dazu
      alles, was aus Sicht eines Nutzers sinnvoll ist, auch zum Ausblenden: Motto, Statistik und die Sammlung
      aus dem Rang-Pfad kamen dazu, jeder Teil lässt sich ausblenden, die Bestwerte lassen sich auswählen.

### Geklärt

- Was außer dem Look aufs Profil kommt: siehe Profil (am 10. Oktober 2026 mit dem Besitzer geklärt).

### Hinweise aus Version 2.6

- XP seit Version 2.6: pro Satz 10 XP plus 1 pro Wiederholung (höchstens 30), dazu ein Gewichts-Bonus von bis zu
  30 XP. Der Bonus vergleicht das geschätzte 1RM des Satzes mit dem Maßstab der Übung (`www/js/scale.js`);
  ein Satz auf typischem Niveau bringt 15 XP. Dazu 50 XP pro Rekord und Bonus-XP aus `state.bonus`
  (Tages-Quest 100, Ruhetag-Quest 50, Wochenbonus 100-300). Rechnung in `www/js/stats.js`
  (`xpForSet`, `liftXp`, `derive`, `levelInfo`).
- Mit Beispieldaten stieg das Level durch den Gewichts-Bonus von 19 auf 25. Nach dem Update erklärt eine
  Karte auf der Startseite einmal, um wie viel das eigene Level gestiegen ist (`meta.xpNote`).
- Seltenheit kommt aus dem Rang der Station: E und D Normal, C und B Selten, A Episch, S und SS Legendär
  (`rarityOf` in `www/js/look.js`).
- Belohnungen, Stationen und Rang-Abzeichen: `www/js/look.js`. Banner und Effekte: `www/js/art.js`.
  Rang-Pfad und Look-Auswahl: `www/js/view-rank.js`. Profil: `www/js/view-profile.js`. Effekte beim Abholen:
  `www/js/fx.js`. Daten in `state.rewards`, `state.bonus` und `state.profile`, neue Felder immer in
  `migrate()` in `www/js/ops.js` abfangen.

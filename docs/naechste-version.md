# Nächste Version von KINTORE

Stand: 10. Oktober 2026. Aktuelle Version: 2.8 (Release v2.8). Darin steckt der ganze Plan 2.7: einfache Bedienung,
eigene Knöpfe, volleres Profil und 9 neue Banner nach Vorlagen des Besitzers. Die Nummer der APK zählt jeden Build mit,
deshalb heißt sie 2.8.

Für die nächste Version ist noch nichts geplant. Neue Wünsche mit dem Besitzer abstimmen und dann hier eintragen,
alles Spätere in `fahrplan.md`. Schreibt der Besitzer nur `kintore`, ihn fragen, was als Nächstes kommt.

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

# Nächste Version von KINTORE

Stand: 10. Oktober 2026. Aktuelle Version: 2.6 (Seltenheit, XP nach Gewicht, Profil).
Geplant für Version 2.7: eigene Knöpfe, ein volleres Profil, klare Bedienung mit kurzer Einführung und neue Banner
nach Vorlagen des Besitzers.

Dieser Plan ist mit dem Besitzer abgestimmt. Was hier steht, ist entschieden. Neue Ideen, die hier
nicht stehen, erst mit ihm absprechen und nicht einfach einbauen.

## Ziel

Das Profil soll voll und hochwertig wirken, und man soll sofort verstehen, wo man was findet und ändert.

## 1. Eigene Knöpfe statt Standard-Look

- [ ] Die Knöpfe unten im Profil (Bearbeiten, Look) und ähnliche Knöpfe in der App sehen zu sehr nach typischer
      KI-App aus. Sie bekommen einen eigenen KINTORE-Stil.
- [ ] Eckige Neon-Knöpfe mit abgeschrägten Ecken wie in einem Game-Menü, ohne Glitzer-Symbol.
- [ ] Bearbeiten als kleiner Stift direkt am Profilbild statt eines großen Knopfs.

## 2. Profil voller

- [ ] Das Profil soll nicht leer wirken, die Effekte sollen mehr zu sehen sein.
- [ ] Größerer Banner und Effekte über die ganze Profilkarte statt nur ums Profilbild.
- [ ] Abzeichen unter dem Namen, zum Beispiel Rang, Serie und Rekorde.
- [ ] Neon-Kalender mit den letzten Trainingswochen.

## 3. Klar, wo was ist

- [ ] Man versteht sofort, wo man was findet und ändert.
- [ ] Banner, Rahmen, Effekt und die anderen Teile vom Look lassen sich direkt im Profil antippen und ändern.
- [ ] Kurze Einführung für Profil und Rang-Pfad: nur beim ersten Öffnen, wenige kurze Schritte, überspringbar.

## 4. Banner nach Vorlagen des Besitzers

- [ ] Neue Banner im Stil der Referenzbilder, die der Besitzer schickt.

## Noch offen

Vor dem Bauen kurz beim Besitzer nachfragen:

- Referenzbilder für die Banner: schickt der Besitzer im nächsten Chat. Erst ansehen, dann mit ihm klären,
  wie viele Banner es werden und ab welchem Level sie kommen.

## Später, nicht in der nächsten Version

Steht in `fahrplan.md`: Online-Funktionen, App Stores und ein neues Design.

## Hinweise für die Umsetzung

- Knöpfe: `.btn-neon`, `.btn-ghost`, `.btn-claim` und `.link-btn` in `www/css/app.css` werden in der ganzen App
  benutzt. Der neue Stil ändert deshalb viele Seiten, im Bildvergleich darf sich sonst nichts verschieben.
  Das Glitzer-Symbol (`sparkle`) steckt in mehreren Knöpfen und Zeilen.
- Profilbild: Antippen des Stifts öffnet Bearbeiten (Bild, Name, Motto). Antippen von Banner, Rahmen, Titel
  oder Effekt öffnet die passende Auswahl (`lookSheet(type)` in `www/js/view-rank.js`).
- Effekte über die ganze Karte: `effectParts()` in `www/js/art.js` liefert schon einen Teil `card`, bisher nur
  beim Sternenregen. Auf dem Handy flüssig bleiben, nur `transform` und `opacity` bewegen.
- Abzeichen und Kalender aus vorhandenen Daten: Rang aus `D().level`, Serie aus `weekStreak`, Rekorde aus
  `D().prEvents`, Trainingstage aus `D().dates`.
- Einführung: Gesehenes in `state.meta` merken (zum Beispiel `meta.intro`), mit "weniger Bewegung" ohne Animation.
- Neue Banner zeichnet `www/js/art.js` bisher nur mit SVG und CSS. Wenn die Vorlagen echte Bilder brauchen,
  vorher mit dem Besitzer klären, wie groß die APK dadurch werden darf.
- Testen mit `.claude/tests/` (Beispieldaten, Screenshots, Bildvergleich, Logik-Tests).
- Wenn ein Punkt fertig ist, hier abhaken (`[x]`) und den Stand oben anpassen.

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

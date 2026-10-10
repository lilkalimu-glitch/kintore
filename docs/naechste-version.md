# Nächste Version von KINTORE

Stand: 10. Oktober 2026. Aktuelle Version: 2.5 (Rang-Pfad, Belohnungen, Tages-Quest, Serien-Schutz).

Dieser Plan ist mit dem Besitzer abgestimmt. Was hier steht, ist entschieden. Neue Ideen, die hier
nicht stehen, erst mit ihm absprechen und nicht einfach einbauen.

## Ziel

Freischaltungen sollen sich wirklich besonders anfühlen.

## 1. Belohnungen nach Rang

- [ ] Je höher der Rang, desto besonderer sehen die Belohnungen aus.
- [ ] Jede Belohnung zeigt, aus welchem Rang sie kommt.
- [ ] Seltenheitsstufen: Normal, Selten, Episch, Legendär. Ab Episch sind Belohnungen animiert,
      Legendär bekommt Effekte wie Neon-Flammen oder Funken.

## 2. XP nach Gewicht, fair pro Übung

- [ ] In jeder Übung gilt: mehr Gewicht und mehr Volumen bringen mehr XP.
- [ ] Jede Übung hat ihren eigenen Maßstab mit typischen Werten, damit Beinpresse und Curls gleich fair sind.
- [ ] Wer stärker ist, bekommt mehr XP.

## 3. Profil

- [ ] Eigenes Profil, auf dem alles Freigeschaltete zu sehen ist: Banner, Avatar-Rahmen, glänzende Farben
      und Effekte wie Neon-Flammen.
- [ ] Antippen zeigt das Profil, ähnlich wie bei Discord.
- [ ] Die Belohnungen aus dem Rang-Pfad werden direkt Teile vom Profil.

## Noch offen

Vor dem Bauen kurz beim Besitzer nachfragen:

- Was außer dem Look aufs Profil kommt, zum Beispiel Profilbild, Name, Level oder Bestwerte.

## Später, nicht in der nächsten Version

- Online-Version, in der andere mitmachen und Profile ansehen können.

## Hinweise für die Umsetzung

- XP heute: pro Satz 10 XP plus 1 pro Wiederholung (höchstens 30), 50 XP pro Rekord, dazu Bonus-XP aus
  `state.bonus` (Tages-Quest 100, Ruhetag-Quest 50, Wochenbonus 100-300). Rechnung in `www/js/stats.js`
  (`xpForSet`, `derive`, `levelInfo`).
- Eine neue XP-Rechnung ändert das Level aller Nutzer. Sie darf niemandem Level, Rang oder schon abgeholte
  Belohnungen wegnehmen. Vorher und nachher mit Beispieldaten vergleichen und das Ergebnis dem Besitzer sagen.
- Belohnungen, Stationen und Rang-Abzeichen: `www/js/look.js`. Rang-Pfad und Look-Auswahl:
  `www/js/view-rank.js`. Effekte: `www/js/fx.js`. Daten in `state.rewards` und `state.bonus`, neue Felder
  immer in `migrate()` in `www/js/ops.js` abfangen.
- Testen mit `.claude/tests/` (Beispieldaten, Screenshots, Bildvergleich, Logik-Tests).
- Wenn ein Punkt fertig ist, hier abhaken (`[x]`) und den Stand oben anpassen.

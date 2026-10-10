# Nächste Version von KINTORE

Stand: 10. Oktober 2026. Aktuelle Version: 2.6 (Seltenheit, XP nach Gewicht, Profil).
Alles aus diesem Plan ist in Version 2.6 umgesetzt. Was als Nächstes kommt, ist noch offen.

Dieser Plan ist mit dem Besitzer abgestimmt. Was hier steht, ist entschieden. Neue Ideen, die hier
nicht stehen, erst mit ihm absprechen und nicht einfach einbauen.

## Ziel

Freischaltungen sollen sich wirklich besonders anfühlen.

## 1. Belohnungen nach Rang

- [x] Je höher der Rang, desto besonderer sehen die Belohnungen aus.
- [x] Jede Belohnung zeigt, aus welchem Rang sie kommt.
- [x] Seltenheitsstufen: Normal, Selten, Episch, Legendär. Ab Episch sind Belohnungen animiert,
      Legendär bekommt Effekte wie Neon-Flammen oder Funken.

## 2. XP nach Gewicht, fair pro Übung

- [x] In jeder Übung gilt: mehr Gewicht und mehr Volumen bringen mehr XP.
- [x] Jede Übung hat ihren eigenen Maßstab mit typischen Werten, damit Beinpresse und Curls gleich fair sind.
- [x] Wer stärker ist, bekommt mehr XP.

## 3. Profil

- [x] Eigenes Profil, auf dem alles Freigeschaltete zu sehen ist: Banner, Avatar-Rahmen, glänzende Farben
      und Effekte wie Neon-Flammen.
- [x] Antippen zeigt das Profil, ähnlich wie bei Discord.
- [x] Die Belohnungen aus dem Rang-Pfad werden direkt Teile vom Profil.
- [x] Aufs Profil kommen außerdem Profilbild, Name, Level und Rang sowie Bestwerte. Der Besitzer wollte dazu
      alles, was aus Sicht eines Nutzers sinnvoll ist, auch zum Ausblenden: Motto, Statistik und die Sammlung
      aus dem Rang-Pfad kamen dazu, jeder Teil lässt sich ausblenden, die Bestwerte lassen sich auswählen.

## Geklärt

- Was außer dem Look aufs Profil kommt: siehe Punkt 3 (am 10. Oktober 2026 mit dem Besitzer geklärt).

## Später, nicht in der nächsten Version

Steht in `fahrplan.md`: Online-Funktionen, App Stores und ein neues Design.

## Hinweise für die Umsetzung

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
- Testen mit `.claude/tests/` (Beispieldaten, Screenshots, Bildvergleich, Logik-Tests).
- Wenn ein Punkt fertig ist, hier abhaken (`[x]`) und den Stand oben anpassen.

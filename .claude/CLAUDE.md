# KINTORE: Hinweise für Claude

Öffentliches Repository einer Android-App: Gym-Tracker mit ruhigem Standard-Design (Dunkel, Hell) und dem
früheren Neon-Anime-Look als Design Neon.
Projektsprache ist Deutsch: Texte in der App, Code-Kommentare, Commit-Nachrichten und Doku.

## Pläne
- `docs/naechste-version.md`: abgestimmter Plan für die nächste Version. Schreibt der Besitzer nur `kintore`, diesen
  Plan umsetzen: erst die Punkte unter "Noch offen" klären, dann bauen, testen und ausliefern.
- `docs/fahrplan.md`: grobe Pläne für später (Online, App Stores, Design). Nicht ohne Absprache bauen.
- `docs/bedienung.md`: die 10 Regeln für einfache Bedienung und Barrierefreiheit (seit 2.7). Gelten für alles Neue.
- Erledigtes abhaken (`[x]`), nicht löschen.
- Neue Wünsche des Besitzers sauber umformulieren, von ihm bestätigen lassen und dann eintragen: alles für die nächste
  Version in `docs/naechste-version.md`, alles Spätere in `docs/fahrplan.md`.

## Regeln
- Keine persönlichen Trainings- oder Körperdaten committen. `www/data/seed.json` enthält nur Übungsliste und Vorlagen
  und wird mit `node scripts/make-starter.mjs` erzeugt.
- Den Signaturschlüssel nie unverschlüsselt committen. Im Repository liegt nur `signing/kintore.jks.enc`
  (AES-256, Passwort im GitHub-Secret `KEYSTORE_PASSWORD`).
- `appId` (`com.lilkalimu.kintore` in `capacitor.config.json`) und den Schlüssel nie ändern. Sonst lassen sich neue
  Versionen nicht mehr über die alte installieren und Nutzer verlieren beim Neuinstallieren ihre Daten.
- Im Workflow `persist-credentials: false` beim Checkout und `npm install --ignore-scripts` beibehalten.

## Bauen und ausliefern
- Jeder Push auf `main` startet `.github/workflows/build-apk.yml`. Ergebnis: Release `v2.<run>` mit `KINTORE-2.<run>.apk`, versionCode 100 + Lauf (muss immer steigen).
- Reine Doku-Änderungen (`*.md`, `docs/`, `.claude/`) lösen keinen Build aus.
- Build-Logs lassen sich aus Claude-Sitzungen nicht laden. Bei Fehlern schreibt der Schritt `Fehler melden` die letzten
  Log-Zeilen als Annotations: `gh api repos/<owner>/<repo>/check-runs/<job-id>/annotations`.

## Aufbau
- `www/`: die App, ohne Build-Schritt (ES-Module). Einstieg `js/app.js`, Ansichten `js/view-*.js`, Sheets `js/sheets.js`.
- Alle Datenänderungen laufen über `js/ops.js`, Berechnungen (Rekorde, Level, Quest, Tipps) in `js/stats.js`.
- Rang-Pfad: Belohnungen, Stationen, Seltenheit und Rang-Abzeichen in `js/look.js`, die Seite in `js/view-rank.js`.
  Abgeholte Stationen und der angelegte Look liegen in `state.rewards`, Bonus-XP (Tages-Quest, Ruhetag-Quest,
  Wochen-Serie) als Einträge in `state.bonus`. Die Farbe aus dem Rang-Pfad ist die Akzentfarbe und läuft
  über die CSS-Variablen `--acc*` und `:root[data-accent]` (in `ruhig.css` je ein Wert für Dunkel und Hell); Pink
  bleibt der Standard. Die Seltenheit folgt aus dem Rang der Station (`rarityOf`).
  Seit 2.11 geht der Pfad bis Level 100 (Rang SSS ab 90). Abgeholt wird pro Level (`state.rewards.claimed`): Neue
  Belohnungen deshalb nur auf Level ohne bisherige Station legen, sonst gälten sie bei schon abgeholten Stationen
  sofort als abgeholt. Der Logik-Test "Rang-Pfad bis Level 100" prüft das.
- Banner und Effekte fürs Profil zeichnet `js/art.js` nur mit SVG und CSS (keine Bilddateien). Die dunklen Banner
  nach den Vorlagen des Besitzers stehen in `js/banners.js`. Effekte haben die Teile `back`, `front` (ums Profilbild)
  und `card` (über die ganze Profilkarte). In Dunkel und Hell sind Effekte flach in der Effekt-Farbe `--fx`
  (`ruhig.css`, in Hell ein eigener Ton je Akzentfarbe), ohne Leuchten. Jeder neue Effekt braucht dort Regeln und
  ein Standbild für "weniger Bewegung" (`app.css`, Block "Neue Effekte"). Rahmen können für Dunkel und Hell eine
  eigene Verzierung und Lage des runden Bildes haben (`calm` in `FRAMES`, `js/look.js`).
- XP pro Satz: Grundwert plus Gewichts-Bonus nach dem Maßstab der Übung in `js/scale.js` (typisches 1RM).
  Neue Übungen in der Startliste brauchen dort einen Eintrag, sonst greift die Schätzung über Name und Muskelgruppe.
- Profil: `js/view-profile.js`, Daten in `state.profile` (Name, Motto, Bestwerte, was gezeigt wird). Das Profilbild
  liegt wie das Hintergrundbild getrennt in IndexedDB (Schlüssel `avatar`, `js/me.js`) und ist nicht im Backup.
  Jeder Teil vom Look ist im Profil antippbar und öffnet `lookSheet(type)` (Fenster mit Vorschau und Reitern).
- Einführung beim ersten Öffnen (Profil, Rang-Pfad): `js/intro.js`, gesehen in `state.meta.intro`.
- Neu zeichnen (`js/core.js`, seit 2.9): Beim Öffnen einer Seite baut `render()` sie neu, danach gleicht `morph()`
  nur noch Unterschiede ab. Elemente bleiben dabei stehen: Listener in `after()` nur einmal anhängen
  (`once(el, key)`) und Daten erst beim Auslösen lesen. Schlüssel: `data-persist` für Deko (gleicher Schlüssel heißt
  gleiches Aussehen, wird unverändert übernommen; `persistHtml` nimmt einen Fingerabdruck und markiert das Stück,
  damit es gar nicht erst eingelesen wird) und `data-key` für feste Kennungen (Inhalt wird abgeglichen). Klassen,
  die Skripte nachträglich setzen und behalten sollen, stehen in `JS_CLASSES`. Leisten mit `data-keep` behalten
  ihre Position, der angetippte Knopf bleibt an seiner Stelle (außer `data-anchor="none"`). `openSheet` tauscht
  in einem offenen Fenster nur den Inhalt. Klicks immer an das zurückgegebene `.sheet-body` hängen, nicht an
  `.sheet`. Lieber Teile gezielt ändern als ein ganzes Fenster neu zu zeichnen.
- Nachrechnen (seit 2.9): `commit(fn, { derive })`. `'keep'`, wenn Sätze, Übungsdaten fürs Level, Körpergewicht
  und Bonus-XP gleich bleiben. Eine Funktion trägt nur das Neue nach (`deriveAppend`, `deriveBonus` in
  `js/stats.js`). Im Zweifel nichts angeben, dann rechnet die App alles neu.
- Sichern (`js/store.js`, seit 2.9): IndexedDB mit einem Eintrag pro Monat (`sets:JJJJ-MM`) und dem Haupteintrag
  ohne Sätze (`setMonths`). Geschrieben werden nur geänderte Monate, alles in einer Transaktion. Ein geänderter
  Satz ist deshalb ein neues Objekt (`updateSet`). Das alte Format (bis 2.8) wird weiter gelesen. Die Datei-Kopie
  auf Android höchstens alle 30 Sekunden in Ruhe und sofort beim Wechsel in den Hintergrund.
- Rang-Pfad zeichnen (seit 2.9): Nur Stationen in der Nähe sind voll gezeichnet (`app.ui.roadFilled`), weit
  entfernte werden wieder leer. Positionen kommen ohne Messen aus `GEO` in `js/view-rank.js`, mit denselben Maßen
  wie `.road` und `.node` in `app.css`: Ändert sich dort etwas, beides anpassen. Beim schnellen Wischen wird nichts
  nachgezeichnet, erst wenn es ruhiger wird.
- Animationen außerhalb des Bildes hält `watchOff` (`js/core.js`) über die Animations-API an und startet sie neu,
  wenn das Element ins Bild kommt. Keine Animation auf ein Element legen, in dem (oder in dessen `::before` oder
  `::after`) noch etwas animiert ist: Dann rechnet Chrome jedes Bild im Hauptthread. Lieber auf einen Behälter
  daneben legen. Prüfen mit `leerlauf.py`.
- Daten liegen auf dem Handy (IndexedDB plus Datei-Kopie). Neue Felder oder Formatänderungen immer in `migrate()` in
  `js/ops.js` abfangen, damit vorhandene Daten erhalten bleiben.
- `scripts/patch-android.py` passt das von Capacitor erzeugte Android-Projekt an (Icon, Startbild, Leisten in der
  Farbe des Designs über das eigene Plugin `KintoreBars`, Rechte, Version).
- Schriften kommen als Teil-Schriften aus `www/fonts`. Nach neuen Zeichen in Texten `python3 scripts/build-fonts.py`
  ausführen (braucht fontTools sowie Noto Sans CJK, Inter, TeX Gyre Adventor und Barlow SemiBold auf dem System).

## Testen
- `python3 -m http.server 8080 --directory www` und im Handy-Format (393 × 852) mit Playwright oder Browser prüfen.
- Fertige Hilfen in `.claude/tests/` (Anleitung in der README dort): Beispieldaten erzeugen, Screenshots aller Seiten,
  Bildvergleich vorher/nachher, Logik-Tests für Level, XP, Serie und Belohnungen, Springen und die Regeln für die
  Bedienung (`bedienung.py`: Tippflächen, Namen für TalkBack, Schriftgröße, 130 % System-Schrift) und Tempo
  (`tempo.py`: Reaktionszeit mit gedrosseltem Prozessor wie auf einem Mittelklasse-Handy, Ziele aus dem Plan).
  Seit 2.9 dazu: `neuzeichnen.py` (morph), `speichern.py` (nichts geht verloren, auch beim Umstieg von 2.8),
  `ablauf.py` (die wichtigsten Abläufe durchklicken) und `leerlauf.py` (in Ruhe keine Arbeit im Hauptthread).
  Seit 2.10: `kontrast.py` (Kontrast von Text und Symbolen nach Regel 2, gemessen auf dem echten Hintergrund).
- Tempo auf dem Handy (seit 2.11): siebenmal auf die Version unten in den Einstellungen tippen (`js/tempo.js`).
  Der Besitzer kann die Werte kopieren und schicken. Ändert keine Daten.
- Jedes Design testen: Beispieldaten mit `--design hell`, `--design neon` oder `--design neon-alt` (Neon wie in 2.9,
  für den Bildvergleich mit alten Bildern) erzeugen, ohne gilt Dunkel.
- Vor dem Push: keine Konsolenfehler, kein horizontales Scrollen, alle Ansichten aufrufbar, auch mit leeren Daten,
  in allen drei Designs. Seiten, die sich nicht ändern sollen, per Bildvergleich gegen den Stand vorher prüfen.

## Texte in der App
Kurz und umgangssprachlich, wie ein normaler Gym-Tracker. Keine Gedankenstriche, keine Pfeile im Fließtext,
keine typografischen Anführungszeichen, keine rhetorischen Fragen, keine Werbesprache, keine Dreier-Aufzählungen
und keine Beteuerungen zum Datenschutz. Bereiche mit Bindestrich schreiben (`8-12 Wdh.`).

## Design
Designs zum Wählen in den Einstellungen: Dunkel (Standard), Hell, Automatisch (seit 2.11) und Neon (der Look bis 2.9).
- `js/theme.js` setzt das Design an `<html>`: `data-theme` (dunkel, hell, neon), `data-calm` bei Dunkel und Hell,
  `data-jp` für japanische Zeichen. `index.html` setzt es schon vor dem ersten Bild (localStorage `kintore:design`).
  Im Code fragen `isCalm()`, `isLight()` und `jpOn()` nach dem Design. Beim Wechsel zeichnet `redesign()` alles neu.
  Seit 2.11 gibt es Automatisch (`theme: 'auto'`): `themeOf()` ist die Wahl, `shownTheme()` das gezeigte Design.
  Hell oder Dunkel vom Handy kommt in der App über das Plugin `KintoreBars` (`system`, Ereignis `system`), im
  Browser über `prefers-color-scheme` (`watchSystemTheme` in `js/native.js`). Ein offenes Fenster mit `rebuild` in
  `openSheet` baut sich beim Wechsel neu auf. Das Startbild folgt dem Design (`setStart`, Startbilder in
  `scripts/patch-android.py`: `KintoreLaunchLight`, `KintoreLaunchAuto`, ab Android 13 über `setSplashScreenTheme`).
- `app.css` ist das Design Neon und liegt in der CSS-Ebene `neon`. `ruhig.css` legt Dunkel und Hell in der Ebene
  `ruhig` darüber: gilt nur mit `data-calm` und gewinnt immer, egal wie genau die Selektoren in `app.css` sind.
  Neues immer in beiden Dateien gestalten und in allen drei Designs ansehen.
- Dunkel und Hell: ruhig wie eine Store-App. Flache Karten, eine Akzentfarbe, kein Glas, kein Leuchten, keine
  Farbverläufe, keine kursiven Titel, keine japanischen Zeichen. Farben nur über die Variablen oben in `ruhig.css`.
  Text in der Akzentfarbe mit `--acc-text`, Flächen mit `--acc` oder `--acc-soft`. Schriften: Barlow SemiBold für
  Titel und Zahlen (`--font-display`), Inter für Text. Symbole aus Lucide (ISC-Lizenz, `icon()` in `js/util.js`).
  Knöpfe abgerundet: Hauptknopf gefüllt in der Akzentfarbe, die anderen grau. Rang-Abzeichen flach, Profilbild ohne
  Foto mit Initialen. Schilder gibt es mit Wort (KRAFT, DISZIPLIN) und mit Kanji. Kanji-Belohnungen darf man
  tragen, sonst zeigt der Standard keine Schriftzeichen.
- Neon: Navy-Grund, Glas-Karten (seit 2.9 ohne Unschärfe, fast deckend), Neon-Glow in Pink, Cyan und Violett.
  Schriften: Adventor (Titel und Zahlen), Inter (Text). Knöpfe eckig mit abgeschrägten Ecken wie in einem
  Game-Menü, ohne Glanz und ohne Leuchten darunter. Grauer Text `--muted` ist seit 2.11 heller (#9CA7C4), Schrift auf
  der Akzentfarbe dunkel (`--on-acc`), damit alles 4,5 : 1 hat. Japanische Schriftzeichen nur als Deko (Neon-Schild,
  Wasserzeichen in Seitenköpfen, Banner) und nur, wenn sie in den Einstellungen an sind (`jpMark()`).
- Für alle Designs: keine bekannten Anime-Figuren, auch nicht aus Referenzbildern des Besitzers, nur Stimmung,
  Farben und Motive übernehmen. Kein Glitzer-Symbol in Knöpfen. Knöpfe mit Text haben seit 2.11 nur bei
  Hinzufügen (plus) und Löschen (Papierkorb) ein Symbol, alle anderen nur das Wort. Starten immer mit Wort.
  Knöpfe: `.btn-neon` (Hauptknopf), `.btn-ghost`, `.btn-danger`, `.btn-dashed`. Alles Antippbare mindestens 44 px, besser 48 px (unsichtbar über `::after`
  vergrößern). Text mindestens 4,5 : 1 Kontrast, auch auf `--acc-soft` und über Effekten (`kontrast.py`).
- App-Symbol: dunkles K aus Barlow auf Pink (`ICON_BG` in `scripts/patch-android.py`), Startbild mit Symbol und
  Schriftzug KINTORE (seit 2.11 auch hell mit dunkler Schrift). Neu zeichnen mit `python3 scripts/build-icons.py`.
  Die Android-Leisten folgen dem Design (`setBars` in `js/native.js`).

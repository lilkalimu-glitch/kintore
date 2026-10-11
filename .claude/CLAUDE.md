# KINTORE 筋トレ: Hinweise für Claude

Öffentliches Repository einer Android-App: Gym-Tracker im Neon-Anime-Stil.
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
  Wochen-Serie) als Einträge in `state.bonus`. Die Neon-Farbe läuft über die CSS-Variablen `--acc*` und
  `:root[data-accent]`; Pink bleibt der Standard. Die Seltenheit folgt aus dem Rang der Station (`rarityOf`).
- Banner und Effekte fürs Profil zeichnet `js/art.js` nur mit SVG und CSS (keine Bilddateien). Die dunklen Banner
  nach den Vorlagen des Besitzers stehen in `js/banners.js`. Effekte haben die Teile `back`, `front` (ums Profilbild)
  und `card` (über die ganze Profilkarte).
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
- `scripts/patch-android.py` passt das von Capacitor erzeugte Android-Projekt an (Icon, Startbild, dunkle Leisten,
  Rechte, Version).
- Japanische Zeichen kommen aus Teil-Schriften in `www/fonts`. Nach neuen Zeichen in Texten `python3 scripts/build-fonts.py`
  ausführen (braucht fontTools sowie Noto Sans CJK, Inter und TeX Gyre Adventor auf dem System).

## Testen
- `python3 -m http.server 8080 --directory www` und im Handy-Format (393 × 852) mit Playwright oder Browser prüfen.
- Fertige Hilfen in `.claude/tests/` (Anleitung in der README dort): Beispieldaten erzeugen, Screenshots aller Seiten,
  Bildvergleich vorher/nachher, Logik-Tests für Level, XP, Serie und Belohnungen, Springen und die Regeln für die
  Bedienung (`bedienung.py`: Tippflächen, Namen für TalkBack, Schriftgröße, 130 % System-Schrift) und Tempo
  (`tempo.py`: Reaktionszeit mit gedrosseltem Prozessor wie auf einem Mittelklasse-Handy, Ziele aus dem Plan).
  Seit 2.9 dazu: `neuzeichnen.py` (morph), `speichern.py` (nichts geht verloren, auch beim Umstieg von 2.8),
  `ablauf.py` (die wichtigsten Abläufe durchklicken) und `leerlauf.py` (in Ruhe keine Arbeit im Hauptthread).
- Vor dem Push: keine Konsolenfehler, kein horizontales Scrollen, alle Ansichten aufrufbar, auch mit leeren Daten.
  Seiten, die sich nicht ändern sollen, per Bildvergleich gegen den Stand vorher prüfen.

## Texte in der App
Kurz und umgangssprachlich, wie ein normaler Gym-Tracker. Keine Gedankenstriche, keine Pfeile im Fließtext,
keine typografischen Anführungszeichen, keine rhetorischen Fragen, keine Werbesprache, keine Dreier-Aufzählungen
und keine Beteuerungen zum Datenschutz. Bereiche mit Bindestrich schreiben (`8-12 Wdh.`).

## Design
Wird mit dem Plan in `docs/naechste-version.md` (Schritt 1) umgebaut: neuer ruhiger Standard wie eine Store-App,
ohne Glas, Leuchten und japanische Zeichen, dazu ein helles Design. Der bisherige Look bleibt als Design Neon.
Bis der Umbau fertig ist, beschreibt der Rest dieses Abschnitts den bisherigen Look, danach nur noch das Design Neon.

Navy-Grund, Glas-Karten (seit 2.9 ohne Unschärfe, fast deckend), Neon-Glow in Pink, Cyan und Violett. Schriften: Adventor (Titel und Zahlen), Inter (Text).
Japanische Schriftzeichen nur als Deko (Neon-Schild, Wasserzeichen in Seitenköpfen, Banner). Keine bekannten
Anime-Figuren, auch nicht aus Referenzbildern des Besitzers: nur Stimmung, Farben und Motive übernehmen.
Knöpfe sind eckig mit abgeschrägten Ecken wie in einem Game-Menü, ruhig, ohne Glanz und ohne Leuchten darunter:
`.btn-neon` (Hauptknopf, gefüllt, dunkle Schrift), `.btn-ghost` (Rand), `.btn-danger`, `.btn-dashed`. Kein
Glitzer-Symbol in Knöpfen. Alles Antippbare mindestens 44 px, besser 48 px (unsichtbar über `::after` vergrößern).

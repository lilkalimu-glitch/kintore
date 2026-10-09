# KINTORE 筋トレ

Gym-Tracker im Neon-Anime-Stil für Android. Läuft komplett offline und ohne Konto. Alles, was du einträgst,
bleibt auf deinem Handy.

## Installieren

1. Auf dem Android-Handy rechts unter **Releases** die neueste Version öffnen und `KINTORE-1.x.apk` herunterladen.
2. Die Datei öffnen. Android fragt einmal, ob der Browser Apps installieren darf: erlauben, dann installieren.
   Die Warnung „Unbekannte App“ ist normal, weil KINTORE nicht aus dem Play Store kommt.
3. Beim ersten Pausen-Timer fragt Android nach Mitteilungen. Erlauben, damit sich der Timer auch bei gesperrtem Handy meldet.

**Updates:** Neue Version herunterladen und einfach über die alte installieren. Deine Daten bleiben erhalten.

## Was die App kann

- **Training eintragen:** Vorlagen für Pull, Push und Beine (frei anpassbar), Gewicht und Wiederholungen mit großen
  Plus/Minus-Knöpfen, letzter Wert wird vorgeschlagen, Notizen pro Satz, vergessene Trainings nachtragen.
- **Steigerungs-Tipp:** Doppelprogression je Übung. Schaffst du überall die Obergrenze deines Wiederholungsbereichs,
  schlägt die App mehr Gewicht vor.
- **Pausen-Timer** mit Vibration und Mitteilung bei gesperrtem Handy.
- **NEW PR!** – neue Bestleistungen werden gefeiert.
- **Level und Rang (E bis SS):** XP für jeden Satz und jeden Rekord.
- **Tages-Quest:** zeigt nach der Rotation Pull → Push → Beine → Ruhetag, was heute dran ist, mit Zielwerten.
- **Wochen-Radar:** Sätze pro Muskelgruppe der letzten 7 Tage und deine Serie an Wochen mit mindestens 3 Trainings.
- **Übungen:** über 100 Übungen, Diagramme, Bestwerte je Wiederholungszahl, Schätzung für 1 bis 12 Wiederholungen,
  Scheibenrechner für die Langhantel.
- **Körpergewicht** mit 7-Tage-Schnitt und optionalem Zielgewicht.
- **Eigenes Hintergrundbild**, **Backup** als Datei, **Import aus FitNotes** (Backup-Datei `.fitnotes`).

## Daten und Datenschutz

KINTORE baut keine Internetverbindung auf. Die Daten liegen nur auf dem Handy (plus einer Kopie im App-Ordner).
Über **Einstellungen → Backup speichern** kannst du eine Sicherung anlegen, z. B. für einen Handywechsel.

## Für Entwickler

- `www/` ist die App selbst: HTML, CSS und JavaScript-Module ohne Build-Schritt.
  Ansehen im Browser: `python3 -m http.server 8080 --directory www`.
- Jeder Push auf `main` baut über `.github/workflows/build-apk.yml` mit Capacitor eine signierte APK und
  veröffentlicht sie als Release.
- Der Signaturschlüssel liegt verschlüsselt in `signing/kintore.jks.enc`. Der Build braucht das Secret
  `KEYSTORE_PASSWORD`. Wer das Projekt kopiert, muss einen eigenen Schlüssel anlegen.
- Startdaten (Übungsliste und Vorlagen): `node scripts/make-starter.mjs`.

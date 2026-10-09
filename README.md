# KINTORE 筋トレ

Gym-Tracker im Neon-Anime-Stil für Android. Offline, ohne Konto, ohne Werbung.

<p align="center">
  <img src="docs/screenshots/start.jpg" width="200" alt="Startseite mit Level, Rang und Tages-Quest">
  <img src="docs/screenshots/training.jpg" width="200" alt="Training mit Sätzen, Steigerungs-Tipp und Pausen-Timer">
  <img src="docs/screenshots/pr.jpg" width="200" alt="NEW PR bei einer neuen Bestleistung">
  <img src="docs/screenshots/uebung.jpg" width="200" alt="Übung im Detail mit Verlaufsdiagramm">
</p>

## Download

Die neueste Version gibt es unter **[Releases](../../releases/latest)** als `KINTORE-2.x.apk`.

1. Die APK auf dem Android-Handy herunterladen und öffnen.
2. Android fragt einmal, ob der Browser Apps installieren darf. Erlauben, dann installieren.
   Der Hinweis „Unbekannte App“ erscheint, weil KINTORE nicht aus dem Play Store kommt.
3. Beim ersten Pausen-Timer fragt Android nach Mitteilungen. Erlauben, damit sich der Timer auch bei gesperrtem Handy meldet.

Updates werden einfach über die vorhandene Version installiert. Die Daten bleiben dabei erhalten.

## Funktionen

- **Training eintragen** mit Vorlagen für Pull, Push und Beine (frei anpassbar), großen Plus/Minus-Knöpfen,
  Notizen pro Satz und dem Nachtragen vergessener Trainings
- **Steigerungs-Tipp** nach Doppelprogression: Wer überall die Obergrenze des Wiederholungsbereichs schafft,
  bekommt mehr Gewicht vorgeschlagen
- **Pausen-Timer** mit Vibration und Mitteilung bei gesperrtem Handy
- **NEW PR!** bei jeder neuen Bestleistung
- **Level und Rang** von E bis SS, XP für jeden Satz und jeden Rekord
- **Tages-Quest:** zeigt nach der Rotation Pull → Push → Beine → Ruhetag, was heute dran ist
- **Wochen-Radar** mit Sätzen pro Muskelgruppe und einer Serie für Wochen mit mindestens 3 Trainings
- **Über 100 Übungen** mit Diagrammen, Bestwerten je Wiederholungszahl, Schätzung für 1 bis 12 Wiederholungen
  und Scheibenrechner für die Langhantel
- **Körpergewicht** mit 7-Tage-Schnitt und optionalem Zielgewicht
- **Eigenes Hintergrundbild**, **Backup als Datei** und **Import aus FitNotes**

## Datenschutz

KINTORE stellt keine Internetverbindung her. Alle Einträge bleiben lokal auf dem Gerät.
Über *Einstellungen → Backup speichern* lässt sich eine Sicherung anlegen, z. B. für einen Handywechsel.

## Technik

- Web-App aus HTML, CSS und JavaScript-Modulen in einer Android-Hülle mit [Capacitor](https://capacitorjs.com) 7
- Jeder Push auf `main` baut über GitHub Actions eine signierte APK und veröffentlicht sie als Release
- Der Signaturschlüssel liegt verschlüsselt in `signing/kintore.jks.enc`, das Passwort im Secret `KEYSTORE_PASSWORD`.
  Kopien des Projekts brauchen einen eigenen Schlüssel.
- Im Browser ansehen: `python3 -m http.server 8080 --directory www`
- Übungsliste und Vorlagen für den Start: `node scripts/make-starter.mjs`

Die Screenshots zeigen Beispieldaten.

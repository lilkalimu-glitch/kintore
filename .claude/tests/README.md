# Tests für KINTORE

Hilfen, damit Änderungen nichts kaputt machen. Alle Befehle im Hauptordner des Repos ausführen.
Die Beispieldaten sind erfunden, echte Trainingsdaten gehören nicht ins Repo.

## Vorbereitung

```sh
python3 -m http.server 8080 --directory www > /dev/null 2>&1 &
python3 .claude/tests/beispieldaten.py 85 /tmp/kt/beispiel.json      # etwa Level 25, Rang B
python3 .claude/tests/beispieldaten.py 120 /tmp/kt/luecke.json luecke # Serie mit geretteter Woche
python3 .claude/tests/beispieldaten.py 85 /tmp/kt/max.json max        # höchster Rang, alle Belohnungen bereit
```

## Ablauf bei einer Änderung

1. **Vorher** Bilder vom alten Stand machen:
   `python3 .claude/tests/screenshots.py /tmp/kt/beispiel.json /tmp/kt/vorher`
2. Änderung einbauen.
3. **Nachher** dieselben Bilder machen:
   `python3 .claude/tests/screenshots.py /tmp/kt/beispiel.json /tmp/kt/nachher`
4. Vergleichen: `python3 .claude/tests/vergleich.py /tmp/kt/vorher /tmp/kt/nachher`
   Seiten, die sich nicht ändern sollen, müssen "gleich" sein.
5. Leere App prüfen: `python3 .claude/tests/screenshots.py leer /tmp/kt/leer`
6. Logik prüfen: `node .claude/tests/logik.test.mjs`
7. Animationen mit `--bewegung` aufnehmen und die Bilder ansehen.

Seltenheiten im Pfad prüfen: mit `max.json` die Seite `rang` öffnen und Stationen einzeln abholen (Level 3 Normal,
24 Selten, 41 Episch, 52 Legendär). Das Profil liegt unter `profil`.

`screenshots.py` meldet Konsolenfehler und horizontales Scrollen und endet dann mit Exit-Code 1.
Über `await import('./js/ops.js')` in `page.evaluate` lassen sich Sätze eintragen, um Level-Up, Rang-Aufstieg
und Quest-Banner auszulösen.

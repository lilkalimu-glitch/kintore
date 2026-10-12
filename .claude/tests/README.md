# Tests für KINTORE

Hilfen, damit Änderungen nichts kaputt machen. Alle Befehle im Hauptordner des Repos ausführen.
Die Beispieldaten sind erfunden, echte Trainingsdaten gehören nicht ins Repo.

## Vorbereitung

```sh
python3 -m http.server 8080 --directory www > /dev/null 2>&1 &
python3 .claude/tests/beispieldaten.py 85 /tmp/kt/beispiel.json      # etwa Level 25, Rang B
python3 .claude/tests/beispieldaten.py 120 /tmp/kt/luecke.json luecke # Serie mit geretteter Woche
python3 .claude/tests/beispieldaten.py 85 /tmp/kt/max.json max        # höchster Rang, alle Belohnungen bereit
python3 .claude/tests/beispieldaten.py 85 /tmp/kt/intro.json intro    # Einführungen noch nicht gesehen
python3 .claude/tests/beispieldaten.py 1100 /tmp/kt/gross.json        # etwa 3 Jahre Verlauf, für den Tempo-Test
python3 .claude/tests/beispieldaten.py 85 /tmp/kt/hell.json --design hell  # dasselbe im Design Hell
```

Ohne `intro` gelten die Einführungen für Profil und Rang-Pfad als gesehen, damit die Screenshots vergleichbar bleiben.

Seit 2.10 gibt es drei Designs: Dunkel (Standard, ohne `--design`), `hell` und `neon`. Dazu `neon-alt`: Neon mit
japanischen Zeichen und dem Schild von früher, also der Look von 2.9, um alte Bilder zu vergleichen. Alle Tests in
jedem Design laufen lassen, im hellen Design besonders `kontrast.py`.

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
8. Springen prüfen: `python3 .claude/tests/springen.py /tmp/kt/beispiel.json` misst, ob Leisten, Listen oder
   Fenster nach dem Antippen zurückspringen oder sich neu aufbauen, ob der angetippte Knopf an seiner Stelle bleibt
   und ob Animationen beim Neuzeichnen weiterlaufen. Stand 2.7: nichts springt.
9. Bedienung prüfen: `python3 .claude/tests/bedienung.py /tmp/kt/beispiel.json` prüft die Regeln aus
   `docs/bedienung.md` auf allen Seiten und in den wichtigsten Fenstern: Tippflächen, Namen für Knöpfe,
   Schriftgröße und ob mit 130 % System-Schrift etwas abgeschnitten wird.
10. Tempo prüfen: `python3 .claude/tests/tempo.py /tmp/kt/beispiel.json` und dasselbe mit `gross.json` misst mit
    4-fach gedrosseltem Prozessor (etwa ein Mittelklasse-Handy), wie lange Antippen, Seitenwechsel, Fenster,
    Abholen und Satz speichern bis zum nächsten Bild brauchen, ob die App danach stockt und wie flüssig der
    Rang-Pfad beim schnellen Wischen bleibt. Jede Messung läuft 3 Runden in frischen Browsern, gezeigt wird der
    Median. Ziele: jede Reaktion bis 100 ms, Rang-Pfad bis 300 ms, kein Stocken und kein Bild beim Wischen über
    50 ms. Die Grafikkarte misst der Test nicht. Werte vorher und nachher stehen in `docs/naechste-version.md`.
11. Neuzeichnen prüfen: `python3 .claude/tests/neuzeichnen.py /tmp/kt/beispiel.json` baut 400 zufällige Seiten
    ineinander um (morph in `www/js/core.js`) und zählt bei echten Aktionen, wie viel neu gebaut wird.
12. Speichern prüfen: `python3 .claude/tests/speichern.py /tmp/kt/beispiel.json` startet mit dem alten Format
    (bis 2.8), ändert Daten auf viele Arten, lädt neu und vergleicht. Prüft auch die Datei-Kopie.
13. Abläufe prüfen: `python3 .claude/tests/ablauf.py /tmp/kt/beispiel.json` klickt Training, Verlauf, Körper,
    Einstellungen (auch Design wechseln), Rang-Pfad, Look und Profil durch und prüft jedes Ergebnis auf der Seite.
14. Kontrast prüfen: `python3 .claude/tests/kontrast.py /tmp/kt/hell.json` misst auf allen Seiten, mitten im
    Training, in den Fenstern, bei den Effekten und in der Einführung die echte Farbe hinter jedem Text
    (Bildschirmfoto ohne Schrift) und prüft Regel 2 aus `docs/bedienung.md`: Text 4,5 : 1, große Schrift und
    Symbole in Knöpfen ohne Text 3 : 1. Ohne Daten: `kontrast.py leer --design hell`. Die Farben aus dem Rang-Pfad
    lassen sich prüfen, indem man in den Daten `rewards.equip.color` setzt (pink, eis, toxic, uv, sunset, crimson
    oder gold).

Animationen, die jedes Bild Arbeit im Hauptthread machen, sieht man so: Seite öffnen, ein paar Sekunden warten und
mit Chrome-Tracing zählen, wie oft `UpdateLayoutTree` läuft. Auf Start, Rang-Pfad und Profil sollte es in Ruhe 0 sein.
Achtung: Hat ein Element selbst eine Animation und darin (oder in seinem `::before`/`::after`) läuft noch eine,
rechnet Chrome jedes Bild neu. Die äußere Bewegung gehört dann auf einen Behälter daneben.

Seltenheiten im Pfad prüfen: mit `max.json` die Seite `rang` öffnen und Stationen einzeln abholen (Level 3 Normal,
24 Selten, 41 Episch, 52 Legendär). Das Profil liegt unter `profil`.

`screenshots.py` meldet Konsolenfehler und horizontales Scrollen und endet dann mit Exit-Code 1.
Über `await import('./js/ops.js')` in `page.evaluate` lassen sich Sätze eintragen, um Level-Up, Rang-Aufstieg
und Quest-Banner auszulösen.
15. Admin-Modus prüfen: `python3 .claude/tests/admin.py /tmp/kt/beispiel.json [bilder-ordner]` tippt 7-mal (Tempo
    erst nach der Pause) und 15-mal auf die Version, legt ein Passwort fest, prüft, dass kein Look gesperrt ist und
    Level, XP und Abgeholtes gleich bleiben, schaltet Admin aus und meldet sich mit falschem und richtigem Passwort an.

# Regeln für die Bedienung von KINTORE

Stand: 10. Oktober 2026. Recherchiert für Version 2.7 aus den Richtlinien von Google und Apple, den
Regeln für Barrierefreiheit (WCAG 2.2) und den bekannten Usability-Regeln von Jakob Nielsen.
Jede neue Ansicht und jeder neue Knopf wird gegen diese Liste geprüft.

## Die 10 Regeln

1. **Groß genug zum Tippen.** Alles, was man antippt, ist mindestens 48 × 48 groß, mit etwas Abstand
   dazwischen. Ein kleines Symbol bekommt dafür unsichtbaren Rand.
2. **Gut lesbar.** Text hat mindestens 4,5 : 1 Kontrast zum Hintergrund, große Schrift (ab 24 px oder
   fett ab 19 px) mindestens 3 : 1. Ränder und Symbole von Bedienelementen mindestens 3 : 1.
   Fließtext nicht unter 14 px, nichts unter 11 px. Größere Schrift in den Android-Einstellungen
   darf nichts abschneiden.
3. **Farbe ist nie das einzige Zeichen.** Ausgewählt, erledigt oder gesperrt erkennt man zusätzlich an
   Haken, Schloss, Rahmen oder Text.
4. **Ein klarer Hauptknopf.** Pro Ansicht gibt es höchstens einen auffälligen Knopf für die wichtigste
   Aktion, alles andere ist ruhiger. Gleiche Dinge sehen überall gleich aus und heißen gleich.
5. **Sofort sichtbare Rückmeldung.** Jede Aktion zeigt sofort, dass sie geklappt hat. Wichtige Zustände
   (zum Beispiel "heute eingetragen") bleiben auf der Seite stehen und sind nicht nur ein kurzer Hinweis.
   Kurze Hinweise bleiben lange genug stehen, um sie zu lesen.
6. **Nichts springt.** Nach dem Antippen bleibt man genau da, wo man war. Leisten, Listen und Fenster
   behalten ihre Position und bauen sich nicht sichtbar neu auf.
7. **Fehler verzeihen.** Löschen lässt sich rückgängig machen oder wird vorher bestätigt. Jedes Fenster
   geht mit der Zurück-Taste oder durch Tippen daneben zu.
8. **Sehen statt merken.** Man sieht, was man antippen kann. Symbole ohne Text bekommen einen Namen.
   Dinge ändert man dort, wo man sie sieht (zum Beispiel den Banner direkt im Profil).
9. **Einführung nur wenn nötig.** Kurz, ein Gedanke pro Schritt, nur beim ersten Mal und jederzeit
   überspringbar. Besser ein Tipp im richtigen Moment als eine lange Anleitung vorab.
10. **Ruhige Bewegung, für alle bedienbar.** Animationen sind kurz und ruhig, nichts blinkt schnell.
    Mit "Animationen entfernen" in Android steht alles still. Jeder Knopf hat einen Namen, den TalkBack
    vorlesen kann. Reine Deko wird beim Vorlesen übersprungen.

## Umsetzung in der App

- Mindestgröße: `min-height: 48px` für Knöpfe, Symbol-Knöpfe 44-48 px mit unsichtbarem Rand.
- Hauptknopf: `.btn-neon` (gefüllt, eckig). Zweitknöpfe: `.btn-ghost` (Rahmen, eckig). Text-Links:
  `.link-btn` mit 44 px hoher Tippfläche.
- Animationen nutzen nur `transform` und `opacity` und laufen nicht bei `prefers-reduced-motion`.
- Deko bekommt `aria-hidden="true"`, Knöpfe ohne Text ein `aria-label`.
- Neu zeichnen ohne Springen: Leisten mit `data-keep` behalten ihre Position, der angetippte Knopf bleibt
  an seiner Stelle, Fenster werden nur innen aktualisiert.

## Quellen

- [Google: Touch target size](https://support.google.com/accessibility/android/answer/7101858)
- [Android Developers: Make apps more accessible](https://developer.android.com/guide/topics/ui/accessibility/apps)
- [Apple Human Interface Guidelines: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [W3C: What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [W3C: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [W3C: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [W3C: Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- [W3C: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [Nielsen Norman Group: 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [Nielsen Norman Group: Mobile-App Onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/)

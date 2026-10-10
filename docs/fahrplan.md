# Fahrplan für später

Grobe Pläne des Besitzers für die Zeit nach der nächsten Version (siehe `naechste-version.md`).
Noch nichts davon ist im Detail geplant. Vor dem Bauen jeweils mit ihm abstimmen und dann in
`naechste-version.md` übernehmen. Erledigtes abhaken, nicht löschen.

## Online

- [ ] Online-Rangliste
- [ ] Freunde hinzufügen
- [ ] Jeder hat ein eigenes Profil, über das man Leute hinzufügen kann
- [ ] Auf dem Profil die besten Lifts als Video hochladen
- [ ] Chat in der App, der wie Discord funktioniert

## Verfügbarkeit

- [ ] Version fürs iPhone
- [ ] Android-Version im Play Store
- [ ] iPhone-Version im App Store

## Design

- [ ] Sauber und professionell wie eine marktfertige App, die jeden anspricht
- [ ] Design noch mal überdenken, damit es jeder gern benutzt und es nicht nur kitschig wirkt

## Gut zu wissen

Stand Oktober 2026, vor dem Start neu prüfen.

- Heute speichert KINTORE alles nur auf dem Handy. Für Rangliste, Freunde, Chat und Videos braucht es einen
  Server mit Konten und Anmeldung. Chat und Videos brauchen außerdem Melden und Blockieren, und der Datenschutz
  (DSGVO) muss stimmen.
- Play Store: einmalig 25 US-Dollar Gebühr. Neue private Entwicklerkonten müssen vor dem Start einen geschlossenen
  Test mit mindestens 12 Testern machen, die 14 Tage am Stück dabei sind.
- App Store: Apple-Entwicklerprogramm für 99 US-Dollar im Jahr, darüber laufen auch Tests mit TestFlight.
  Die iPhone-Version braucht zum Bauen einen Mac, zum Beispiel einen Mac-Runner in GitHub Actions.
- Android ab 2027: Google will weltweit verlangen, dass Apps auch außerhalb des Play Stores von registrierten
  Entwicklern kommen. Apps von nicht registrierten Entwicklern lassen sich dann nur noch über einen Umweg
  installieren. Für Hobby-Entwickler soll es ein Konto ohne Ausweis und ohne Gebühr geben, beschränkt auf
  20 Geräte. Das betrifft auch die APK über GitHub.
- Beim Wechsel in den Play Store prüfen, wie sich der bestehende Signaturschlüssel bei Play App Signing
  weiterverwenden lässt, damit Updates über die GitHub-Version installiert werden können.

Quellen:
- [Google Play: Testanforderungen für neue private Konten](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Google Play: Registrierungsgebühr](https://support.google.com/googleplay/android-developer/answer/6112435)
- [Apple Developer Program](https://developer.apple.com/programs/)
- [Android Authority: Zeitplan für die Entwickler-Verifizierung](https://www.androidauthority.com/android-sideloading-changes-timeline-3679204/)

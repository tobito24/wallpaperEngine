# ColorWar - Notizen

- Simulationsregel implementiert (2026-09-13), siehe CLAUDE.md "Concept" - live getestet, funktioniert
- Preset-Startmuster implementiert (2026-09-14): `combo_preset` WE-Property mit empty/speckle/sectors/stripes/rings,
  siehe CLAUDE.md "Concept" + "Architecture". Per Playwright-Screenshots verifiziert (npm run dev), noch nicht live
  in der echten WE-Editor-Vorschau getestet.
- Zahlentasten 1-5 zum schnellen Durchschalten der Presets beim Entwickeln (dev-only, siehe CLAUDE.md "Controls")
- publishing.md angelegt (2026-09-14) - Title/Genre/Description/Preview-Hinweise stehen
- Nächster Schritt: im WE-Editor `dist/index.html` laden, Property-Panel gegen `project.json` prüfen, Preview
  aufnehmen, dann "Publish to Workshop" mit den Daten aus `publishing.md` ausfüllen
- Idee für mehr Farben/komplexere Regeln: siehe CLAUDE.md Architecture-Abschnitt, ist bewusst so gebaut

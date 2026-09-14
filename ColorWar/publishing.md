# ColorWar - Publishing

Metadaten für den "Publish to Workshop"-Dialog im WE-Editor (siehe root `CLAUDE.md` → Dev workflow), damit das
manuelle Ausfüllen nicht jedes Mal neu überlegt werden muss. Titel/Beschreibung bewusst kurz halten - lange Texte
liest im Workshop niemand.

**Neuer Workshop-Eintrag, kein Update des alten**: Die ursprüngliche 3-Farben-Version (rot/grün/blau) ist noch
live im Workshop. Der 7-Farben-Regenbogen-`CYCLE` (siehe `simulation/Color.ts`) ist ein eigenständiger Nachfolger
und wird als neuer Eintrag veröffentlicht, nicht als Update des bestehenden.

## Title

ColorWar: Rainbow Road

## Genre

Abstract

## Description

Red, orange, yellow, green, blue, indigo and violet battle for territory in an endless cyclic dominance
automaton. Tap any tile to pick a side, choose a starting pattern, then sit back and watch a living rainbow
sweep across your desktop forever.

## Age rating

G - All Ages (Standard für dieses Repo, siehe root `CLAUDE.md`)

## Visibility

Public (Standard für dieses Repo, siehe root `CLAUDE.md`)

## Preview image

Manuell im Editor über "Capture preview" aufnehmen, kein `preview.jpg` im Repo nötig. Default-Preset ist
`speckle` (siehe `simulation/presets.ts` → `DEFAULT_PRESET`), passt gut zum Regenbogen-Thema und zeigt alle 7
Farben gleichzeitig; mitten in der Ausbreitung einfangen, nicht direkt beim Start.

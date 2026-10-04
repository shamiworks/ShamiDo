# ShamiDō

A free web-based notation app for shamisen, designed primarily for Tsugaru style. Create, edit and print tablature directly in your browser.

**[Open ShamiDō](https://shamiworks.github.io/ShamiDo/)**

## Features

- Tsugaru-style tablature notation
- Technique marks: sukui, hajiki, keshi, uchi, maebachi, suri, oshibachi
- Duration underlines and dots
- Finger marks
- Triplets
- Repeat, double-repeat and stop barlines
- Crescendo and decrescendo hairpins
- Text boxes for performance notes
- Multiple pages with staff and lyric units
- Undo and redo
- Save and load files
- Print to PDF or paper

## Usage

No installation required. Open the link above in any modern desktop browser.

## Version

Version 1.3. See [docs/CHANGELOG.md](docs/CHANGELOG.md) for changes.

## Known issues

1. Hiding a selected staff unit and leaving it selected shows its selection border in print preview.
2. Pasting over part of a triplet can leave an orphaned triplet marker in the saved data (not drawn).
3. Clearing the target tsubo of a resolved suri/oshibachi leaves the arc in place.
4. A division keeps its marks (maebachi, finger, ha, technique marks, hairpin, text box) after its last tsubo is cleared by a slot clear; only a division or range clear removes them.
5. Clearing the lowest tsubo of a division with a slot clear can leave the sukui/hajiki/keshi/uchi flag in the saved data with no mark on screen.
6. Screen rendering looks slightly tighter than print because of pixel rounding (about 0.13mm); the PDF is the accurate view.

## Licence

ShamiDō is released under the [Creative Commons Attribution 4.0 International licence](https://creativecommons.org/licenses/by/4.0/). You are free to share and adapt this work provided you give appropriate credit to ShamiWorks.

## Created by

[ShamiWorks](https://shamiworks.github.io)

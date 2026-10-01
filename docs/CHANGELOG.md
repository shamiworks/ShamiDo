# ShamiDō 三味道 Changelog

## v1.2

### Barlines

**Division-based barline editing**
- Select a time-division and press a barline button to place, change or remove the barline on its right edge
- Pressing a different type changes the barline; pressing the same type removes it
- The first and last barlines (positions 0 and 32) always exist: they can be changed in type but not removed
- On the first time-division, repeated presses cycle through the start of the measure: barline at the start, then at the end of the first division, then reset
- Barline button presses are ignored while a range of time-divisions is selected
- Alt+click barline selection removed
- Each press is one undo step

**Free placement on every staff unit**
- Barlines can be placed at any position on any staff unit
- Measure buttons 2, 4 and 8 now set normal barlines at their positions, replacing the interior barlines
- The "Free" button is now "0" and removes all interior barlines
- The first and last barlines keep their types when a measure button is pressed
- Clearing a staff unit's content leaves its barlines unchanged
- Number of measures no longer saved; older files still open with their saved barlines

**Repeat number box**
- Close-repeat barlines now carry an editable repeat number above the staff
- Type digits only (up to two); the × is added automatically
- Empty boxes show a faint ×? on screen and are hidden in print
- Saved with the document, carried by copy/paste, and removed if the barline changes type

### Editing

**Copy/paste**
- Copying a range of time-divisions now includes the barlines inside it
- Pasting replaces any barlines in the target range with the copied ones
- Whole-unit copy/paste carries barlines as before
- Paste is now its own undo step

**Great staff**
- The Great staff and Remove great staff buttons are replaced by a single toggle button
- Removes the group if any selected unit is in one; otherwise creates a group from two or more selected units
- Palette section renamed "Misc" / その他

## v1.1

### Branding
- App renamed from ShamiTab to ShamiDō 三味道
- Watermark updated to reflect new name

### New Features

**Undo/Redo**
- Ctrl+Z / Cmd+Z to undo, Ctrl+Y / Cmd+Y (or Ctrl+Shift+Z / Cmd+Shift+Z) to redo
- Full document snapshot model, capped at 50 entries
- Undo and Redo menu items in Edit menu, greyed out when unavailable
- History resets on file open and new document

**Export / Print**
- File menu item "Export / Print" triggers the browser print dialog
- Users can select "Save as PDF" from the print dialog to export a PDF
- Replaces the previous "Print" menu item

**Logo dropdown**
- Clicking the ShamiWorks logo opens a dropdown menu
- Contains: EN/JA language toggle, About, Instructions, Buy me a boba
- Available on all screen sizes
- Right menu items remain visible on larger screens

**Oshibachi mark**
- Oshibachi arc replaced with a right-angle ⌐ shape
- Runs vertically up from the start tsubo, then horizontally right to the mid-left of the end tsubo
- More closely matches common shamisen notation practice

**Keyboard navigation**
- Navigate between staff units and lyric units using keyboard

**Multi time-division selection**
- Click and drag or shift-click to select multiple time-divisions
- Copy and paste supported

**Multi-staff selection**
- Click and drag or shift-click to select multiple staff units
- Copy and paste supported
- Works across hidden (blank) units

**Great staff**
- Select two or more adjacent staff units and click the Great staff palette button
- Draws an extended barline at position 0 and position 32, connecting the selected units
- Indicates simultaneous music played by separate shamisen
- Persistent: saved and restored with the document
- Remove button clears great staff from any selected unit within the group

**Staff metadata expansion**
- Staff metadata column expanded from 10mm to 15mm (overflows 5mm into left page margin)
- Bar number field (row 1, contentEditable, right-aligned, saved with document)
- Part label / general annotation field (rows 2–4, contentEditable, saved with document)
- String number labels shifted to accommodate new fields
- All placeholder text matches entered text style

**Hide/show blank units**
- Any staff unit or lyric unit can be hidden using the Hide palette button
- Hidden units remain in the document and are fully selectable
- Selection outline visible on hidden units
- Hide/Show button label updates to reflect current selection state
- Works with multi-staff selection
- Persistent: saved and restored with the document

**Suri/oshibachi workflow improvements**
- Arc draws immediately when suri or oshibachi is activated, before any tsubo are entered
- Placeholder arc anchors to the selected string slot and targets the next division on the same string (suri) or next string (oshibachi)
- Arc redraws to the nearest real tsubo as notes are entered
- Supported flows:
  - A: activate → enter start tsubo → enter end tsubo
  - B: enter start tsubo → activate → enter end tsubo
  - C: enter both tsubo → navigate back to start → activate (original flow)
- Clearing the start tsubo reverts the arc to placeholder state
- Clearing all tsubo from a division removes the arc entirely
- Arc cleared correctly by both Backspace key and Clear palette button

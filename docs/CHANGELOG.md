# ShamiDō 三味道 Changelog

## v1.1 (in progress)

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

/*  
======================================================
  Menu Handling
======================================================  
*/

const menuButtons = document.querySelectorAll(".menu-btn");
const menus = document.querySelectorAll(".menu-dropdown");

function closeAllMenus() {
  menus.forEach(menu => menu.classList.remove("open"));
}

menuButtons.forEach(button => {
  button.addEventListener("click", (e) => {
    e.stopPropagation();

    const menuName = button.dataset.menu;
    const menu = menuName
      ? document.querySelector(`.menu-dropdown[data-menu="${menuName}"]`)
      : null;

    if (!menu) {
      closeAllMenus();
      return;
    }

    const isOpen = menu.classList.contains("open");

    closeAllMenus();

    if (!isOpen) {
      menu.classList.add("open");
    }
  });
});

// click-away closes everything
document.addEventListener("click", () => {
  closeAllMenus();
});

// clicks inside menus should NOT close them
menus.forEach(menu => {
  menu.addEventListener("click", e => e.stopPropagation());
});

const infoBtn = document.getElementById("info-btn");
const infoPanel = document.getElementById("info-panel");
const infoClose = document.getElementById("info-close");

infoBtn.addEventListener("click", () => {
  infoPanel.classList.toggle("open");
});

infoClose.addEventListener("click", () => {
  infoPanel.classList.remove("open");
});

/*  
======================================================
  Undo/redo history
======================================================  
*/

const HISTORY_MAX = 50;
let historyStack = [];
let historyPointer = -1;
let isRestoring = false;

function pushHistory() {
  if (isRestoring) return;
  // Truncate redo history
  historyStack = historyStack.slice(0, historyPointer + 1);
  historyStack.push(JSON.stringify(serializeDocument()));
  if (historyStack.length > HISTORY_MAX) historyStack.shift();
  historyPointer = historyStack.length - 1;
  updateUndoRedoMenu();
}

function pushHistoryIfChanged() {
  if (isRestoring) return;
  if (JSON.stringify(serializeDocument()) === historyStack[historyPointer]) return;
  pushHistory();
}

function undoHistory() {
  if (historyPointer <= 0) return;
  historyPointer--;
  isRestoring = true;
  loadDocument(JSON.parse(historyStack[historyPointer]));
  isRestoring = false;
  updateUndoRedoMenu();
}

function redoHistory() {
  if (historyPointer >= historyStack.length - 1) return;
  historyPointer++;
  isRestoring = true;
  loadDocument(JSON.parse(historyStack[historyPointer]));
  isRestoring = false;
  updateUndoRedoMenu();
}

function resetHistory() {
  historyStack = [JSON.stringify(serializeDocument())];
  historyPointer = 0;
  updateUndoRedoMenu();
}

function updateUndoRedoMenu() {
  const undoBtn = document.getElementById("edit-undo");
  const redoBtn = document.getElementById("edit-redo");
  if (undoBtn) undoBtn.disabled = historyPointer <= 0;
  if (redoBtn) redoBtn.disabled = historyPointer >= historyStack.length - 1;
}

/*
======================================================
  Page template creation handling
======================================================
*/

// Template shortcuts: interior barline positions (1-31) only.
// 0 is "Clear" (no interior barlines).
const BAR_TEMPLATES = {
  0: [],
  2: [16],
  4: [8, 16, 24],
  8: [4, 8, 12, 16, 20, 24, 28]
};

function createHeader(isFirstPage, pageNumber) {
  const header = document.createElement("div");
  header.classList.add("header");
  if (!isFirstPage) header.classList.add("running-header");

  const ph = HEADER_PLACEHOLDERS[currentLang] || HEADER_PLACEHOLDERS.en;
  const fields = [
    { cls: "dedication-field", editable: true,  placeholder: ph['dedication-field'] },
    { cls: "page-number",      editable: false, placeholder: null                   },
    { cls: "title-field",      editable: true,  placeholder: ph['title-field']      },
    { cls: "subtitle-field",   editable: true,  placeholder: ph['subtitle-field']   },
    { cls: "tuning-field",     editable: true,  placeholder: ph['tuning-field']     },
    { cls: "time-sig-field",   editable: true,  placeholder: ph['time-sig-field']   },
    { cls: "arranger-field",   editable: true,  placeholder: ph['arranger-field']   },
  ];

  fields.forEach(({ cls, editable, placeholder }) => {
    const div = document.createElement("div");
    div.classList.add(cls);
    if (placeholder !== null) div.dataset.placeholder = placeholder;
    if (editable) {
      div.contentEditable = "true";
      div.spellcheck = false;
    }
    header.appendChild(div);
  });

  return header;
}

function createStaffUnit() {
  const block = document.createElement("div");
  block.className = "staff-unit";
  block.dataset.blockType = "staff-unit";
  block.dataset.barlines = JSON.stringify(buildDefaultBarlines(4));

  const metadata = document.createElement("div");
  metadata.className = "staff-metadata";

  const ph = STRINGS[currentLang] || STRINGS.en;

  const barNumber = document.createElement("div");
  barNumber.className = "bar-number";
  barNumber.contentEditable = "true";
  barNumber.spellcheck = false;
  barNumber.dataset.placeholder = ph['metadata-bar-number'];
  barNumber.dataset.barNumber = "";
  metadata.appendChild(barNumber);

  const partLabel = document.createElement("div");
  partLabel.className = "part-label";
  partLabel.contentEditable = "true";
  partLabel.spellcheck = false;
  partLabel.dataset.placeholder = ph['metadata-part-label'];
  partLabel.dataset.partLabel = "";
  metadata.appendChild(partLabel);

  ["", "3", "2", "1"].forEach(n => {
    const s = document.createElement("div");
    s.className = "string-number";
    s.textContent = n;
    metadata.appendChild(s);
  });

  const staffSection = document.createElement("div");
  staffSection.className = "staff-section";
  staffSection.appendChild(createStaffSVG());
  staffSection.appendChild(createNotationLayer());

  block.appendChild(metadata);
  block.appendChild(staffSection);

  drawBarlines(block);

  return block;
}

function createLyricUnit() {
  const block = document.createElement("div");
  block.classList.add("lyric-unit");
  block.dataset.blockType = "lyric-unit";

  const lyricPlaceholders = STRINGS.lyricPlaceholders[currentLang];

  for (let i = 0; i < 3; i++) {
    const lineDiv = document.createElement("div");
    lineDiv.classList.add("lyric-line");
    lineDiv.dataset.line = i + 1;
    lineDiv.dataset.placeholder = lyricPlaceholders[i];
    lineDiv.contentEditable = "true";
    lineDiv.spellcheck = false;
    block.appendChild(lineDiv);
  }

  return block;
}

function generatePage(pageType, pageNumber) {
  const page = document.createElement("div");
  page.classList.add("page");

  const pageContent = document.createElement("div");
  pageContent.classList.add(
    pageType === "lyric" ? "lyric-page-content" : "staff-page-content"
  );

  const isFirstPage = (pageNumber === 1);
  pageContent.appendChild(createHeader(isFirstPage, pageNumber));

  if (pageType === "staff") {
    for (let i = 0; i < 10; i++) {
      pageContent.appendChild(createStaffUnit());
    }
  } else {
    for (let i = 0; i < 5; i++) {
      pageContent.appendChild(createStaffUnit());
      pageContent.appendChild(createLyricUnit());
    }
  }

  page.appendChild(pageContent);

  const watermark = document.createElement("div");
  watermark.className = "watermark";
  watermark.textContent = (STRINGS[currentLang] || STRINGS.en).watermark;
  pageContent.appendChild(watermark);

  document.querySelector(".workspace").appendChild(page);

  // Sync title to/from running headers
  const firstTitle = document.querySelector(".page:first-child .title-field");
  const newTitle = page.querySelector(".title-field");

  if (!isFirstPage && firstTitle) {
    newTitle.textContent = firstTitle.textContent;
  }

  if (isFirstPage) {
    firstTitle.addEventListener("input", () => {
      document.querySelectorAll(".running-header .title-field").forEach(el => {
        el.textContent = firstTitle.textContent;
      });
    });
  }

  updatePageNumbers();
}

function updatePageNumbers() {
  const pageNumbers = document.querySelectorAll(".page-number");
  const total = pageNumbers.length;
  pageNumbers.forEach((el, i) => {
    el.textContent = `${i + 1}/${total}`;
  });
}



/*
======================================================
  Architecture for music notation writing
INPUT LAYER
  ├─ Palette clicks
  └─ Keyboard input
        ↓
INTENT LAYER
  └─ { action, value }
        ↓
DISPATCH LAYER
  └─ dispatchCommit(intent)
        ↓
COMMIT LAYER   ← DOM changes happen here, period
  ├─ commitTsubo
  ├─ commitRest
  ├─ commitDuration (later)
  ├─ commitClear
        ↓
DOM / NOTATION STATE
======================================================
*/

/*  
======================================================
  Input Layer - selection handling
  Selection model:
    - string-slot selection implies time-division selection
    - time-division may be selected without a slot
    - only one of each may be selected at a time
======================================================  
*/

const workspace = document.querySelector(".workspace");

let selectedSlot = null;
let selectedDivision = null;
let selectedStaffUnit = null;

let multiDivisionSelection = null; // { staffUnit, startIndex, endIndex }
let multiDivisionAnchor    = null; // integer index — held across shift+clicks
let multiStaffSelection    = null; // { startUnit, endUnit }
let multiStaffAnchor       = null; // integer index — held across shift+clicks
let clipboard              = null; // { type: "divisions"|"staffUnits", data: [...] }

let dragAnchorDivision = null;
let isDragging = false;
let isDragStaffMode = false;

workspace.addEventListener("click", (e) => {
  // A text box takes its own clicks: focus the text, leave the selection alone
  if (e.target.closest(".text-box")) return;

  // Suppress click when a drag just ended
  if (isDragging) { isDragging = false; return; }

  // Shift+click — multi-selection triggers
  if (e.shiftKey) {
    const division = e.target.closest(".time-division");
    if (division) {
      const unit = division.closest(".staff-unit");
      const clickedIndex = Number(division.dataset.timeIndex);
      if (multiDivisionAnchor === null) {
        // First shift+click: establish anchor from the active single selection
        if (selectedDivision && selectedDivision.closest(".staff-unit") !== unit) return;
        multiDivisionAnchor = selectedDivision
          ? Number(selectedDivision.dataset.timeIndex)
          : clickedIndex;
        clearMultiStaffSelection();
        deselectSlot();
        // selectedDivision is intentionally kept as the visual anchor
      } else if (!multiDivisionSelection || multiDivisionSelection.staffUnit !== unit) {
        return; // Subsequent shift+click on a different unit: ignore
      }
      // Capture anchor before applyMultiDivisionSelection nulls it via clearMultiDivisionSelection
      const anchor = multiDivisionAnchor;
      applyMultiDivisionSelection(unit, anchor, clickedIndex);
      multiDivisionAnchor = anchor; // Restore after the internal clear
      return;
    }
    const clickedUnit = e.target.closest(".staff-unit");
    if (clickedUnit) {
      const allStaff = Array.from(document.querySelectorAll(".staff-unit"));
      const clickedIdx = allStaff.indexOf(clickedUnit);
      if (multiStaffAnchor === null) {
        // First shift+click: establish anchor from current staff unit selection
        multiStaffAnchor = selectedStaffUnit
          ? allStaff.indexOf(selectedStaffUnit)
          : clickedIdx;
        clearMultiDivisionSelection();
        deselectSlot();
        deselectDivision();
      }
      const anchor = multiStaffAnchor;
      applyMultiStaffSelection(allStaff[anchor], allStaff[clickedIdx]);
      multiStaffAnchor = anchor; // Restore after clearMultiStaffSelection nulls it
      return;
    }
    // Shift+click elsewhere: fall through to regular-click handling
  }

  // Regular click: clear any active multi-selection
  clearMultiDivisionSelection();
  clearMultiStaffSelection();

  const staffUnit = e.target.closest(".staff-unit");
  if (staffUnit !== selectedStaffUnit) {
    if (selectedStaffUnit) selectedStaffUnit.classList.remove("selected-unit");
    selectedStaffUnit = staffUnit;
    if (selectedStaffUnit) selectedStaffUnit.classList.add("selected-unit");
    updateBlankButton();
  }

  const slot = e.target.closest(".string-slot");
  const division = e.target.closest(".time-division");

  // Clicked outside anything meaningful
  if (!slot && !division) {
    deselectAll();
    return;
  }

  // Clicked a string slot
  if (slot) {
    selectSlot(slot);
    return;
  }

  // Clicked a division but not a slot → select string 1 slot
  if (division) {
    const string1Slot = division.querySelector('.string-slot[data-string="1"]');
    if (string1Slot) {
      selectSlot(string1Slot);
    } else {
      selectDivision(division);
    }
  }
});

workspace.addEventListener("mousedown", (e) => {
  isDragging = false;
  isDragStaffMode = false;
  if (e.shiftKey || e.button !== 0) return;
  if (e.target.closest(".text-box")) { dragAnchorDivision = null; return; }
  let division = e.target.closest(".time-division");
  if (!division) {
    // May be clicking a blank staff-unit whose children are visibility:hidden
    const unit = e.target.closest(".staff-unit");
    if (unit) division = unit.querySelector(".time-division");
  }
  dragAnchorDivision = (division && division.closest(".staff-unit")) ? division : null;
});

workspace.addEventListener("mousemove", (e) => {
  if (!dragAnchorDivision) return;
  if (!(e.buttons & 1)) { dragAnchorDivision = null; isDragging = false; isDragStaffMode = false; return; }

  const anchorUnit = dragAnchorDivision.closest(".staff-unit");
  const allStaffUnits = Array.from(document.querySelectorAll(".staff-unit"));
  const currentUnit = allStaffUnits.find(u => {
    const r = u.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right &&
           e.clientY >= r.top  && e.clientY <= r.bottom;
  }) ?? null;

  if (isDragStaffMode) {
    // Continue updating staff selection as cursor moves
    const allStaff = Array.from(document.querySelectorAll(".staff-unit"));
    const anchor = multiStaffAnchor;
    applyMultiStaffSelection(allStaff[anchor], currentUnit);
    multiStaffAnchor = anchor;
    return;
  }

  if (currentUnit && currentUnit !== anchorUnit) {
    // Crossed into a different staff unit — switch to staff drag mode
    isDragging = true;
    isDragStaffMode = true;
    clearMultiDivisionSelection();
    deselectSlot();
    deselectDivision();
    const allStaff = Array.from(document.querySelectorAll(".staff-unit"));
    multiStaffAnchor = allStaff.indexOf(anchorUnit);
    const anchor = multiStaffAnchor;
    applyMultiStaffSelection(anchorUnit, currentUnit);
    multiStaffAnchor = anchor;
    return;
  }

  // Same unit — division drag
  const division = e.target.closest(".time-division");
  if (!division || division === dragAnchorDivision) return;
  if (division.closest(".staff-unit") !== anchorUnit) return;
  isDragging = true;
  clearMultiStaffSelection();
  deselectSlot();
  deselectDivision();
  applyMultiDivisionSelection(
    anchorUnit,
    Number(dragAnchorDivision.dataset.timeIndex),
    Number(division.dataset.timeIndex)
  );
});

// Select slot
function selectSlot(slot) {
  if (selectedSlot === slot) return;

  deselectSlot();

  selectedSlot = slot;
  slot.classList.add("selected");

  const division = slot.closest(".time-division");
  selectDivision(division);
}

// Select division
function selectDivision(division) {
  if (!division || selectedDivision === division) return;

  deselectDivision();

  const newStaffUnit = division.closest(".staff-unit");

  // Clear slot if it belongs to a different staff unit than the incoming division
  if (selectedSlot && selectedSlot.closest(".staff-unit") !== newStaffUnit) {
    deselectSlot();
  }

  if (newStaffUnit && newStaffUnit !== selectedStaffUnit) {
    if (selectedStaffUnit) selectedStaffUnit.classList.remove("selected-unit");
    selectedStaffUnit = newStaffUnit;
    selectedStaffUnit.classList.add("selected-unit");
    updateBlankButton();
  }

  selectedDivision = division;
  division.classList.add("selected");
}


// Clearing selections
function deselectSlot() {
  if (!selectedSlot) return;
  selectedSlot.classList.remove("selected");
  selectedSlot = null;
}

function deselectDivision() {
  if (!selectedDivision) return;
  selectedDivision.classList.remove("selected");
  selectedDivision = null;
}

function deselectAll() {
  deselectSlot();
  deselectDivision();
}

function clearMultiDivisionSelection() {
  if (!multiDivisionSelection) return;
  const { staffUnit, startIndex, endIndex } = multiDivisionSelection;
  const lo = Math.min(startIndex, endIndex);
  const hi = Math.max(startIndex, endIndex);
  staffUnit.querySelectorAll(".time-division").forEach(div => {
    if (Number(div.dataset.timeIndex) >= lo && Number(div.dataset.timeIndex) <= hi) {
      div.classList.remove("selected");
    }
  });
  multiDivisionSelection = null;
  multiDivisionAnchor = null;
  // Restore the anchor division's highlight if it is still the active single selection
  if (selectedDivision) selectedDivision.classList.add("selected");
}

function clearMultiStaffSelection() {
  if (!multiStaffSelection) return;
  const { startUnit, endUnit } = multiStaffSelection;
  const allStaff = Array.from(document.querySelectorAll(".staff-unit"));
  const lo = Math.min(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
  const hi = Math.max(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
  for (let i = lo; i <= hi; i++) {
    allStaff[i]?.querySelector(".staff-section")?.classList.remove("selected");
    allStaff[i]?.classList.remove("selected-unit");
  }
  multiStaffSelection = null;
  multiStaffAnchor = null;
  updateBlankButton();
}

function applyMultiDivisionSelection(staffUnit, startIndex, endIndex) {
  clearMultiDivisionSelection();
  multiDivisionSelection = { staffUnit, startIndex, endIndex };
  const lo = Math.min(startIndex, endIndex);
  const hi = Math.max(startIndex, endIndex);
  staffUnit.querySelectorAll(".time-division").forEach(div => {
    const idx = Number(div.dataset.timeIndex);
    div.classList.toggle("selected", idx >= lo && idx <= hi);
  });
}

function applyMultiStaffSelection(startUnit, endUnit) {
  clearMultiStaffSelection();
  multiStaffSelection = { startUnit, endUnit };
  const allStaff = Array.from(document.querySelectorAll(".staff-unit"));
  const lo = Math.min(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
  const hi = Math.max(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
  for (let i = lo; i <= hi; i++) {
    const unit = allStaff[i];
    if (!unit) continue;
    unit.querySelector(".staff-section")?.classList.add("selected");
    unit.classList.add("selected-unit");
    unit.querySelectorAll(".time-division").forEach(div => div.classList.remove("selected"));
  }
  updateBlankButton();
}


// Keyboard Navigation              
const currentSlot = selectedSlot;
const currentDivision = selectedDivision;

const stringNum = currentSlot
  ? Number(currentSlot.dataset.string)
  : null;

document.addEventListener("keydown", (e) => {
  // Lyric line cross-unit navigation (ArrowUp from line 1, ArrowDown from line 3)
  const active = document.activeElement;
  if (active && active.classList.contains("lyric-line")) {
    const lineNum = parseInt(active.dataset.line);
    const lyricUnit = active.closest(".lyric-unit");

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (lineNum === 3) {
        navigateFromLyricDown(lyricUnit);
      } else {
        lyricUnit.querySelector(`.lyric-line[data-line="${lineNum + 1}"]`)?.focus();
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (lineNum === 1) {
        navigateFromLyricUp(lyricUnit);
      } else {
        lyricUnit.querySelector(`.lyric-line[data-line="${lineNum - 1}"]`)?.focus();
      }
      return;
    }

    // ArrowLeft/ArrowRight and all other keys: default browser behaviour
    return;
  }

  // Bypass header block
  if (isTypingInHeader()) return;

  const navKeys = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"];
  if (navKeys.includes(e.key) && (selectedSlot || selectedDivision)) {
    e.preventDefault();
  }

  switch (e.key) {
    case "ArrowUp": moveVertical(+1); break;
    case "ArrowDown": moveVertical(-1); break;
    case "ArrowLeft": moveHorizontal(-1); break;
    case "ArrowRight": moveHorizontal(+1); break;
    case "Escape":
      deselectAll();
      clearMultiDivisionSelection();
      clearMultiStaffSelection();
      break;
  }
});


function moveVertical(direction) {
  if (!selectedSlot) return;

  const division = selectedSlot.closest(".time-division");
  const currentString = Number(selectedSlot.dataset.string);
  const targetString = currentString + direction;

  const targetSlot = division.querySelector(
    `.string-slot[data-string="${targetString}"]`
  );

  if (targetSlot) {
    selectSlot(targetSlot);
    return;
  }

  // String edge reached — cross-unit navigation
  const currentStaffUnit = division.closest(".staff-unit");
  if (!currentStaffUnit) return;

  const allUnits = getAllSelectableUnits();
  const currentUnitIndex = allUnits.indexOf(currentStaffUnit);
  const timeIndex = Number(division.dataset.timeIndex);

  if (direction > 0) {
    // Moving up from string 3 — find previous selectable unit; land on its bottom string (1)
    for (let i = currentUnitIndex - 1; i >= 0; i--) {
      const unit = allUnits[i];
      if (unit.classList.contains("staff-unit")) {
        const layer = unit.querySelector(".notation-layer");
        const targetDiv = layer?.querySelector(`.time-division[data-time-index="${timeIndex}"]`);
        const slot = targetDiv?.querySelector('.string-slot[data-string="1"]');
        if (slot) selectSlot(slot);
        return;
      }
      if (unit.classList.contains("lyric-unit")) {
        const line = unit.querySelector('.lyric-line[data-line="3"]');
        if (line) {
          deselectAll();
          if (selectedStaffUnit) { selectedStaffUnit.classList.remove("selected-unit"); selectedStaffUnit = null; }
          line.focus();
          updateBlankButton();
        }
        return;
      }
    }
  } else {
    // Moving down from string 1 — find next selectable unit; land on its top string (3)
    for (let i = currentUnitIndex + 1; i < allUnits.length; i++) {
      const unit = allUnits[i];
      if (unit.classList.contains("staff-unit")) {
        const layer = unit.querySelector(".notation-layer");
        const targetDiv = layer?.querySelector(`.time-division[data-time-index="${timeIndex}"]`);
        const slot = targetDiv?.querySelector('.string-slot[data-string="3"]');
        if (slot) selectSlot(slot);
        return;
      }
      if (unit.classList.contains("lyric-unit")) {
        const line = unit.querySelector('.lyric-line[data-line="1"]');
        if (line) {
          deselectAll();
          if (selectedStaffUnit) { selectedStaffUnit.classList.remove("selected-unit"); selectedStaffUnit = null; }
          line.focus();
          updateBlankButton();
        }
        return;
      }
    }
  }
}

function moveHorizontal(direction) {
  if (!selectedDivision) return;

  const layer = selectedDivision.closest(".notation-layer");
  if (!layer) return;

  const index = Number(selectedDivision.dataset.timeIndex);
  const targetDivision = layer.querySelector(
    `.time-division[data-time-index="${index + direction}"]`
  );

  if (targetDivision) {
    if (selectedSlot) {
      const stringNum = selectedSlot.dataset.string;
      const targetSlot = targetDivision.querySelector(
        `.string-slot[data-string="${stringNum}"]`
      );
      if (targetSlot) {
        selectSlot(targetSlot);
        return;
      }
    }
    selectDivision(targetDivision);
    return;
  }

  // Edge reached — find the immediately adjacent selectable unit
  const currentStaffUnit = layer.closest(".staff-unit");
  if (!currentStaffUnit) return;

  const allUnits = getAllSelectableUnits();
  const currentUnitIndex = allUnits.indexOf(currentStaffUnit);
  const adjacentIndex = currentUnitIndex + direction;

  if (adjacentIndex < 0 || adjacentIndex >= allUnits.length) return;

  const adjacentUnit = allUnits[adjacentIndex];

  if (adjacentUnit.classList.contains("lyric-unit")) {
    const lineNum = direction > 0 ? 1 : 3;
    const line = adjacentUnit.querySelector(`.lyric-line[data-line="${lineNum}"]`);
    if (line) {
      deselectAll();
      if (selectedStaffUnit) { selectedStaffUnit.classList.remove("selected-unit"); selectedStaffUnit = null; }
      line.focus();
      updateBlankButton();
    }
    return;
  }

  if (adjacentUnit.classList.contains("staff-unit")) {
    const targetTimeIndex = direction > 0 ? 0 : 31;
    const adjacentLayer = adjacentUnit.querySelector(".notation-layer");
    if (!adjacentLayer) return;

    const adjacentDivision = adjacentLayer.querySelector(
      `.time-division[data-time-index="${targetTimeIndex}"]`
    );
    if (!adjacentDivision) return;

    if (selectedSlot) {
      const stringNum = selectedSlot.dataset.string;
      const targetSlot = adjacentDivision.querySelector(
        `.string-slot[data-string="${stringNum}"]`
      );
      if (targetSlot) {
        selectSlot(targetSlot);
        return;
      }
    }

    selectDivision(adjacentDivision);
  }
}

function getAllSelectableUnits() {
  return Array.from(document.querySelectorAll(".staff-unit, .lyric-unit"));
}

function navigateFromLyricDown(lyricUnit) {
  const allUnits = getAllSelectableUnits();
  const currentIndex = allUnits.indexOf(lyricUnit);

  for (let i = currentIndex + 1; i < allUnits.length; i++) {
    const unit = allUnits[i];
    if (unit.classList.contains("staff-unit")) {
      document.activeElement?.blur();
      const layer = unit.querySelector(".notation-layer");
      const div = layer?.querySelector('.time-division[data-time-index="0"]');
      const slot = div?.querySelector('.string-slot[data-string="3"]');
      if (slot) selectSlot(slot);
      return;
    }
    if (unit.classList.contains("lyric-unit")) {
      const line = unit.querySelector('.lyric-line[data-line="1"]');
      if (line) {
        if (selectedStaffUnit) { selectedStaffUnit.classList.remove("selected-unit"); selectedStaffUnit = null; }
        line.focus();
        updateBlankButton();
      }
      return;
    }
  }
}

function navigateFromLyricUp(lyricUnit) {
  const allUnits = getAllSelectableUnits();
  const currentIndex = allUnits.indexOf(lyricUnit);
  const lastTimeIndex = selectedDivision ? Number(selectedDivision.dataset.timeIndex) : 0;

  for (let i = currentIndex - 1; i >= 0; i--) {
    const unit = allUnits[i];
    if (unit.classList.contains("staff-unit")) {
      document.activeElement?.blur();
      const layer = unit.querySelector(".notation-layer");
      let div = layer?.querySelector(`.time-division[data-time-index="${lastTimeIndex}"]`);
      if (!div) div = layer?.querySelector('.time-division[data-time-index="0"]');
      const slot = div?.querySelector('.string-slot[data-string="1"]');
      if (slot) selectSlot(slot);
      return;
    }
    if (unit.classList.contains("lyric-unit")) {
      const line = unit.querySelector('.lyric-line[data-line="3"]');
      if (line) {
        if (selectedStaffUnit) { selectedStaffUnit.classList.remove("selected-unit"); selectedStaffUnit = null; }
        line.focus();
        updateBlankButton();
      }
      return;
    }
  }
}

// Single clear path: Backspace, Delete and the palette Clear button all land here
function handleClear() {
  if (multiDivisionSelection || multiStaffSelection) {
    clearMultiSelectionContent();
    pushHistoryIfChanged();
    return;
  }
  if (!selectedDivision) return; // a single clicked unit stays non-clearable

  if (selectedDivision.dataset.triplet) {
    commitTriplet(selectedDivision);
  } else if (selectedSlot) {
    commitClearSlot(selectedSlot);
  } else {
    commitClearDivision(selectedDivision);
  }
  pushHistoryIfChanged();
}

function clearMultiSelectionContent() {
  if (multiDivisionSelection) {
    const { staffUnit, startIndex, endIndex } = multiDivisionSelection;
    const lo = Math.min(startIndex, endIndex);
    const hi = Math.max(startIndex, endIndex);
    staffUnit.querySelectorAll(".time-division").forEach(div => {
      if (Number(div.dataset.timeIndex) >= lo && Number(div.dataset.timeIndex) <= hi) {
        commitClearDivision(div);
      }
    });
    clearMultiDivisionSelection();
    return;
  }
  if (multiStaffSelection) {
    const { startUnit, endUnit } = multiStaffSelection;
    const allStaff = Array.from(document.querySelectorAll(".staff-unit"));
    const lo = Math.min(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
    const hi = Math.max(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
    for (let i = lo; i <= hi; i++) {
      if (allStaff[i]) clearStaffUnitContent(allStaff[i]);
    }
    clearMultiStaffSelection();
  }
}

function handleCopy() {
  if (multiDivisionSelection) {
    const { staffUnit, startIndex, endIndex } = multiDivisionSelection;
    const lo = Math.min(startIndex, endIndex);
    const hi = Math.max(startIndex, endIndex);
    const data = Array.from(staffUnit.querySelectorAll(".time-division"))
      .filter(div => {
        const idx = Number(div.dataset.timeIndex);
        return idx >= lo && idx <= hi;
      })
      .map(serializeTimeDivision);
    // Hairpins starting in the range are clipped to the end of the range
    data.forEach((d, i) => clipDynamic(d, data.length - i));
    // Text boxes starting in the range are clipped the same way
    data.forEach((d, i) => clipTextBox(d, data.length - i));
    // Interior barlines (lo+1 .. hi), stored relative to the range start
    const barlines = JSON.parse(staffUnit.dataset.barlines || "[]")
      .filter(b => b.pos > lo && b.pos <= hi)
      .map(b => ({ ...b, pos: b.pos - lo }));
    clipboard = { type: "divisions", data, barlines };
    return;
  }
  if (multiStaffSelection) {
    const { startUnit, endUnit } = multiStaffSelection;
    const allStaff = Array.from(document.querySelectorAll(".staff-unit"));
    const lo = Math.min(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
    const hi = Math.max(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
    clipboard = { type: "staffUnits", data: allStaff.slice(lo, hi + 1).map(serializeStaffUnit) };
    return;
  }
  if (selectedDivision) {
    const data = [serializeTimeDivision(selectedDivision)];
    clipDynamic(data[0], 1);   // a one-division copy can't carry a hairpin
    clipTextBox(data[0], 1);   // ...or a text box
    clipboard = { type: "divisions", data };
  }
}

function handlePaste() {
  if (!clipboard) return;

  if (clipboard.type === "divisions") {
    if (!selectedDivision) return;
    const layer = selectedDivision.closest(".notation-layer");
    if (!layer) return;
    const startIdx = Number(selectedDivision.dataset.timeIndex);
    const available = 32 - startIdx;
    if (clipboard.data.length > available) {
      alert(`Not enough space: copied ${clipboard.data.length} divisions but only ${available} available from this position.`);
      return;
    }
    const allDivisions = Array.from(layer.querySelectorAll(".time-division"));
    clipboard.data.forEach((divData, i) => {
      const target = allDivisions.find(d => Number(d.dataset.timeIndex) === startIdx + i);
      if (!target) return;
      // Hairpins are clipped to the unit end (index 31)
      const data = { ...divData };
      clipDynamic(data, 32 - (startIdx + i));
      clipTextBox(data, 32 - (startIdx + i));
      clearDivisionFully(target);
      restoreTimeDivision(target, data);
    });
    const staffUnit = layer.closest(".staff-unit");
    if (staffUnit) {
      // A pasted hairpin replaces any existing one it overlaps (from outside the paste range)
      const endIdx = startIdx + clipboard.data.length - 1;
      const spans = getDynamicSpans(staffUnit);
      const pasted = spans.filter(s => s.start >= startIdx && s.start <= endIdx);
      spans.filter(s => s.start < startIdx && pasted.some(p => s.start <= p.end && s.end >= p.start))
        .forEach(s => removeDynamic(s.div));
      // Same for text boxes
      const boxes = getTextBoxSpans(staffUnit);
      const pastedBoxes = boxes.filter(s => s.start >= startIdx && s.start <= endIdx);
      boxes.filter(s => s.start < startIdx && pastedBoxes.some(p => s.start <= p.end && s.end >= p.start))
        .forEach(s => removeTextBox(s.div));
      renderArcLayer(staffUnit);
      pasteRangeBarlines(staffUnit, startIdx, clipboard.data.length, clipboard.barlines || []);
    }
    pushHistory();
    return;
  }

  if (clipboard.type === "staffUnits") {
    if (!selectedStaffUnit) return;
    const allStaff = Array.from(document.querySelectorAll(".staff-unit"));
    const startIdx = allStaff.indexOf(selectedStaffUnit);
    const available = allStaff.length - startIdx;
    if (clipboard.data.length > available) {
      alert(`Not enough space: copied ${clipboard.data.length} staff units but only ${available} available from this position.`);
      return;
    }
    const targets = allStaff.slice(startIdx, startIdx + clipboard.data.length);
    const hasNotation = targets.some(unit =>
      Array.from(unit.querySelectorAll(".time-division")).some(div =>
        Object.keys(serializeTimeDivision(div)).length > 0
      )
    );
    if (hasNotation && !confirm("This will overwrite existing notation. Continue?")) return;
    targets.forEach((unit, i) => {
      clearStaffUnitContent(unit);
      restoreStaffUnit(unit, clipboard.data[i]);
    });
    pushHistory();
  }
}

// Range paste: replace the target's interior barlines within the paste range
// with the copied ones (offset to startIdx). Positions 0 and 32 are never touched.
function pasteRangeBarlines(staffUnit, startIdx, length, copied) {
  const endIdx = startIdx + length - 1;
  const kept = JSON.parse(staffUnit.dataset.barlines || "[]")
    .filter(b => b.pos === 0 || b.pos === 32 || b.pos <= startIdx || b.pos > endIdx);
  const pasted = copied
    .map(b => ({ ...b, pos: b.pos + startIdx }))
    .filter(b => b.pos > 0 && b.pos < 32);

  staffUnit.dataset.barlines = JSON.stringify(
    [...kept, ...pasted].sort((a, b) => a.pos - b.pos)
  );
  drawBarlines(staffUnit);
}

/*
======================================================
  Input Layer - palette & keyboard handling
======================================================
*/

// Palette
const palette = document.querySelector(".palette");

palette.addEventListener("click", (e) => {
  const btn = e.target.closest(".palette-btn");
  if (!btn) return;

  handlePaletteInput(btn);
});

// Keyboard

let pendingSlot = null;
let pendingValue = "";
let pendingTimer = null;
const UPGRADE_WINDOW = 600; // ms
const DURATION_UNDERLINE_ROTATION = [null, "single", "double"];

const FINGER_ROTATION = [null, "first", "second", "third"];

document.addEventListener("keydown", (e) => {
  if (isTypingInHeader()) return;

  if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undoHistory();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
    e.preventDefault();
    redoHistory();
    return;
  }

  if (!selectedSlot && !selectedDivision && !multiDivisionSelection && !multiStaffSelection) return;

  const intent = keyToIntent(e);
  if (!intent) return;

  if (intent.action === "clear") {
    e.preventDefault();
    handleClear();
    return;
  }

  if (!selectedSlot && !selectedDivision) return;

  // UI-only actions
  if (intent.action === "deselect") {
    deselectAll();
    return;
  }

  // Tsubo digits are handled separately
  if (intent.action === "tsubo" && /^[0-9#]$/.test(intent.value)) {
    handleTsuboDigit(intent.value);
    return;
  }

  // Duration handling
  if (intent.action === "duration-underline-rotate") {
    if (!selectedDivision) return;
    const current = selectedDivision.dataset.durationUnderline ?? null;

    dispatchCommit({
      source: "keyboard",
      action: "duration-underline",
      value: rotateValue(current, DURATION_UNDERLINE_ROTATION)
    });
    return;
  }

  // Finger handling
  if (intent.action === "finger-rotate") {
    if (!selectedDivision) return;
    const current = selectedDivision.dataset.finger ?? null;

    dispatchCommit({
      source: "keyboard",
      action: "finger",
      value: rotateValue(current, FINGER_ROTATION)
    });

    return;
  }

  // Suri and oshibachi handling

  if (intent.action === "suri") {
    if (!selectedSlot && !selectedDivision) return;
    dispatchCommit({
      source: "keyboard",
      action: "suri",
      value: selectedSlot ? selectedSlot.dataset.string : null
    });
    return;
  }

  if (intent.action === "oshibachi") {
    if (!selectedSlot && !selectedDivision) return;
    dispatchCommit({
      source: "keyboard",
      action: "oshibachi",
      value: selectedSlot ? selectedSlot.dataset.string : null
    });
    return;
  }


  // Everything else goes straight to dispatch
  dispatchCommit({
    source: "keyboard",
    ...intent
  });
});

function handleTsuboDigit(digit) {
  if (!selectedSlot) return;

  // Slot changed → reset buffer
  if (pendingSlot !== selectedSlot) {
    clearPending();
  }
  pendingSlot = selectedSlot;

  // SECOND digit (only possible after "1")
  if (pendingValue === "1") {
    const value = "1" + digit;

    dispatchCommit({
      source: "keyboard",
      action: "tsubo",
      value
    });

    clearPending();
    return;
  }

  // FIRST digit
  if (digit === "1") {
    // Start pending window
    pendingValue = "1";

    dispatchCommit({
      source: "keyboard",
      action: "tsubo",
      value: "1"
    });

    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(clearPending, UPGRADE_WINDOW);
    return;
  }

  // Any other digit → commit immediately
  dispatchCommit({
    source: "keyboard",
    action: "tsubo",
    value: digit
  });

  clearPending();
}


function clearPending() {
  pendingSlot = null;
  pendingValue = "";
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}

/*  
======================================================
  Intent Layer
======================================================  
*/

// Keyboard intentions
function keyToIntent(e) {
  // --- global keys --- 
  if (e.key === "Escape") {
    return { action: "deselect" };
  }

  if (e.key === "Backspace" || e.key === "Delete") {
    return { action: "clear" };
  }

  // --- tsubo characters ---
  if (/^[0-9#]$/.test(e.key)) {
    return { action: "tsubo", value: e.key };
  }
  
  if (e.key === "r") {
    return { action: "rest" };
  }
  
  if (e.key === "b") {
    return { action: "tsubo", value: "♭" };
  }

  // --- duration ---
  if (e.key === "d") {
    return { action: "duration-underline-rotate" };
  }

  if (e.key === ".") {
    return { action: "durationDot"};
  }

  // --- technique ---
  if (e.key === "a") {
    return { action: "ha" };
  }

  if (e.key === "s") {
    return { action: "sukui" };
  }
  
  if (e.key === "h") {
    return { action: "hajiki" };
  }

  if (e.key === "k") {
    return { action: "keshi" };
  }

  if (e.key === "u") {
    return { action: "uchi" };
  }
  
  if (e.key === "m") {
  return { action: "maebachi" };
  }

  if (e.key === "i") {
    return { action: "suri" };
  }

  if (e.key === "o") {
    return { action: "oshibachi" };
  }

  // --- triplet ---
  if (e.key === "t") {
    return { action: "triplet" };
  }

  // --- finger ---
  if (e.key === "f") {
    return { action: "finger-rotate" };
  }

  return null;
}

// Palette intentions
function handlePaletteInput(btn) {
  const action = btn.dataset.action;
  let value = btn.dataset.value ?? null;

  if (!action) return;

  if (action === "clear") { handleClear(); return; }

  // Second press of the same palette choice removes it
  if (selectedDivision) {
    if (action === "duration-underline" && selectedDivision.dataset.durationUnderline === value) {
      value = null;
    }
    if (action === "finger" && selectedDivision.dataset.finger === value) {
      value = null;
    }
  }

  if (action === "duration-empty") {
    if (!selectedDivision) return;
    commitClearDuration(selectedDivision);
    pushHistoryIfChanged();
    return;
  }

  // Copy / Paste from palette
  if (action === "editing") {
    if (value === "copy")  handleCopy();
    if (value === "paste") handlePaste();
    return;
  }

  if (action === "toggle-blank")       { commitToggleBlank();       return; }

  // Suri and Oshibachi
  if (action === "suri" || action === "oshibachi") {
    value = selectedSlot ? selectedSlot.dataset.string : null;
  }

  dispatchCommit({
    source: "palette",
    action,
    value
  });

  
}


/*  
======================================================
  Dispatch Layer
======================================================  
*/
function dispatchCommit(intent) {
  console.log("DISPATCH:", intent);

  if (intent.action === "measure") {
    const bars = parseInt(intent.value);
    if (!isNaN(bars)) {
      if (!selectedStaffUnit) {
        alert("Select a staff unit to change the number of measures");
        return;
      }
      applyBarTemplate(selectedStaffUnit, bars);
    }
    pushHistory();
    return;
  }

  if (intent.action === "barline-type") {
    // Acts on the selected division's right edge; ignored during a multi-division range
    if (multiDivisionSelection || !selectedDivision) return;
    if (commitBarlineType(selectedDivision, intent.value)) pushHistory();
    return;
  }

  if (intent.action === "dynamic") {
    if (commitDynamic(intent.value)) pushHistory();
    return;
  }

  if (intent.action === "text-box") {
    if (commitTextBox()) pushHistory();
    return;
  }

  if (intent.action === "great-staff-toggle") {
    if (commitGreatStaffToggle()) pushHistory();
    return;
  }

  if (!selectedDivision) return;

  switch (intent.action) {
    case "tsubo":
      if (!selectedSlot) return;
      commitTsubo(selectedSlot, intent.value);
      break;

    case "rest":
      if (getRestSlot(selectedDivision).classList.contains("has-rest")) {
        commitClearRest(selectedDivision);
      } else {
        commitRest(selectedDivision);
      }
      break;

    case "durationDot":
      commitDurationDot(selectedDivision);
      break;

    case "duration-underline":
      commitDurationUnderline(selectedDivision, intent.value);
      break;

    case "technique":
      commitTechnique(selectedDivision, intent.value);
      break;

    case "sukui":
      commitSukui(selectedDivision, intent.value);
      break;

    case "hajiki":
      commitHajiki(selectedDivision, intent.value);
      break;

    case "keshi":
      commitKeshi(selectedDivision, intent.value);
      break;

    case "uchi":
      commitUchi(selectedDivision, intent.value);
      break;

    case "maebachi":
      commitMaebachi(selectedDivision);
      break;

    case "ha":
      commitHa(selectedDivision);
      break;

    case "suri":
      commitTechArc(selectedDivision, "suri", intent.value);
      break;

    case "oshibachi":
      commitTechArc(selectedDivision, "oshibachi", intent.value);
      break;

    case "triplet":
      commitTriplet(selectedDivision);
      break;

    case "finger":
      commitFinger(selectedDivision, intent.value);
      break;

    case "deselect":
      deselectAll();
      return; // deselect doesn't change document state, skip pushHistory

    default:
      console.warn("Unknown action:", intent);
      return;
  }

  pushHistory();
}

/*  
======================================================
  Commit Layer
======================================================  
*/

// --- Tsubo ---
function commitImmediateTsubo(slot, value) {
  if (!slot || !value) return;

  const division = getDivisionFromSlot(slot);
  if (!division) return;

  // A tsubo cannot coexist with a rest
  commitClearRest(division);

  slot.textContent = value;
  slot.classList.add("has-tsubo");
  slot.classList.remove("has-rest");
}

function commitTsubo(slot, value) {
  commitImmediateTsubo(slot, value);

  const division = slot.closest(".time-division");
  const layer    = division?.closest(".notation-layer");
  const staffUnit = division?.closest(".staff-unit");
  if (!layer || !staffUnit) return;

  const divisions = Array.from(layer.querySelectorAll(".time-division"));
  const divIndex  = divisions.indexOf(division);
  let needsRender = false;

  // Case 0: armed with no string yet — claim this slot's string as the start
  if (division.dataset.techArcArmed && !division.dataset.techArcString) {
    console.log("Case 0 fired", division.dataset.techArcArmed, slot.dataset.string);
    division.dataset.techArcString = slot.dataset.string;
    needsRender = true;
  }

  // Case 1: this division is armed and this slot is its start
  if (division.dataset.techArcArmed && slot.dataset.string === division.dataset.techArcString) {
    const armedType   = division.dataset.techArcArmed;
    const armedString = division.dataset.techArcString;
    const targetString = armedType === "oshibachi" ? Number(armedString) + 1 : Number(armedString);
    console.log("Case 1 fired", armedType, armedString, "targetString:", targetString);
    for (let i = divIndex + 1; i < divisions.length; i++) {
      const targetSlot = divisions[i].querySelector(`.string-slot[data-string="${targetString}"].has-tsubo`);
      if (targetSlot) {
        console.log("Case 1 RESOLVED, offset:", i - divIndex);
        division.dataset.techArc       = armedType;
        division.dataset.techArcString = armedString;
        division.dataset.techArcOffset = String(i - divIndex);
        delete division.dataset.techArcArmed;
        needsRender = true;
        break;
      }
    }
    if (!needsRender) needsRender = true; // attempted but unresolved — still may need redraw
  }

  // Case 2: this slot may be the target of an earlier armed division
  const slotString = slot.dataset.string;
  for (let i = divIndex - 1; i >= 0; i--) {
    const earlyDiv = divisions[i];
    if (!earlyDiv.dataset.techArcArmed) continue;
    const armedType   = earlyDiv.dataset.techArcArmed;
    const armedString = earlyDiv.dataset.techArcString;
    const targetString = armedType === "oshibachi" ? Number(armedString) + 1 : Number(armedString);
    console.log("Case 2 fired", armedType, armedString, "targetString:", targetString, "slotString:", slotString);
    if (String(targetString) === slotString) {
      console.log("Case 2 RESOLVED, offset:", divIndex - i);
      earlyDiv.dataset.techArc       = armedType;
      earlyDiv.dataset.techArcString = armedString;
      earlyDiv.dataset.techArcOffset = String(divIndex - i);
      delete earlyDiv.dataset.techArcArmed;
      needsRender = true;
      break;
    }
  }

  if (needsRender) renderArcLayer(staffUnit);
}

function commitRest(division) {
  if (!division) return;

  commitClearDuration(division);

  const slots = getStringSlots(division);
  const restSlot = getRestSlot(division);

  // Clear all slots
  slots.forEach(slot => {
    slot.textContent = "";
    slot.classList.remove("has-tsubo", "has-rest");
  });

  // Place rest on string 2
  restSlot.textContent = "●";
  restSlot.classList.add("has-rest");
}

// --- Duration ---
function commitDurationUnderline(division, type) {
  if (!division) return;

  // type: "single" | "double"
  commitClearDuration(division);

  const anchor = getBottomMostActiveSlot(division);
  if (!anchor) return;

  if (type === "single") {
    anchor.classList.add("single");
    division.dataset.durationUnderline = "single";
  }

  if (type === "double") {
    anchor.classList.add("double");
    division.dataset.durationUnderline = "double";
  }
}

function commitDurationDot(division) {
  if (!division) return;

  const anchor = getBottomMostActiveSlot(division);
  if (!anchor) return;

  const isNowOn = toggleDatasetFlag(division, "durationDot");

  anchor.classList.toggle("dotted", isNowOn);
}

// --- Techniques ---
function clearClearanceMarks(division) {
  const anchorSlot = getBottomMostActiveSlot(division);
  if (anchorSlot) {
    for (const cls of [".sukui-mark", ".hajiki-mark", ".keshi-mark", ".uchi-mark"]) {
      const el = anchorSlot.querySelector(cls);
      if (el) el.remove();
    }
  }
  delete division.dataset.sukui;
  delete division.dataset.hajiki;
  delete division.dataset.keshi;
  delete division.dataset.uchi;
}

function commitSukui(division) {
  if (!division) return;

  if (division.dataset.sukui !== "true") clearClearanceMarks(division);
  const isNowOn = toggleDatasetFlag(division, "sukui");

  const anchorSlot = getBottomMostActiveSlot(division);
  if (!anchorSlot) return;

  // Remove any existing sukui glyph in this slot
  const existing = anchorSlot.querySelector(".sukui-mark");
  if (existing) existing.remove();

  if (!isNowOn) return;

  const el = document.createElement("span");
  el.classList.add("sukui-mark");
  el.textContent = "ス";

  anchorSlot.appendChild(el);
}

function commitHajiki(division) {
  if (!division) return;

  if (division.dataset.hajiki !== "true") clearClearanceMarks(division);
  const isNowOn = toggleDatasetFlag(division, "hajiki");

  const anchorSlot = getBottomMostActiveSlot(division);
  if (!anchorSlot) return;

  // Remove any existing hajiki glyph in this slot
  const existing = anchorSlot.querySelector(".hajiki-mark");
  if (existing) existing.remove();

  if (!isNowOn) return;

  const el = document.createElement("span");
  el.classList.add("hajiki-mark");
  el.textContent = "ハ";

  anchorSlot.appendChild(el);
}

function commitKeshi(division) {
  if (!division) return;

  if (division.dataset.keshi !== "true") clearClearanceMarks(division);
  const isNowOn = toggleDatasetFlag(division, "keshi");

  const anchorSlot = getBottomMostActiveSlot(division);
  if (!anchorSlot) return;

  // Remove any existing keshi glyph in this slot
  const existing = anchorSlot.querySelector(".keshi-mark");
  if (existing) existing.remove();

  if (!isNowOn) return;

  const el = document.createElement("span");
  el.classList.add("keshi-mark");
  el.textContent = "ケ";

  anchorSlot.appendChild(el);
}

function commitUchi(division) {
  if (!division) return;

  if (division.dataset.uchi !== "true") clearClearanceMarks(division);
  const isNowOn = toggleDatasetFlag(division, "uchi");

  const anchorSlot = getBottomMostActiveSlot(division);
  if (!anchorSlot) return;

  // Remove any existing uchi glyph in this slot
  const existing = anchorSlot.querySelector(".uchi-mark");
  if (existing) existing.remove();

  if (!isNowOn) return;

  const el = document.createElement("span");
  el.classList.add("uchi-mark");
  el.textContent = "ウ";

  anchorSlot.appendChild(el);
}

function commitMaebachi(division) {
  if (!division) return;

  const zone = division.querySelector(".below-zone");
  if (!zone) return;

  const isNowOn = toggleDatasetFlag(division, "maebachi");

  zone.innerHTML = isNowOn ? "マ" : "";
}

function commitHa(division) {
  if (!division) return;

  const zone = division.querySelector(".above-zone");
  if (!zone) return;

  const isNowOn = toggleDatasetFlag(division, "ha");

  // above-zone is exclusive
  zone.innerHTML = "";

  if (!isNowOn) return;

  const el = document.createElement("span");
  el.classList.add("ha-mark");
  el.textContent = "ハ!";
  zone.appendChild(el);
}

function commitTechArc(division, type, string) {
  if (!division) return;

  // --- Toggle off ---
  if (division.dataset.techArc === type || division.dataset.techArcArmed === type) {
    delete division.dataset.techArc;
    delete division.dataset.techArcString;
    delete division.dataset.techArcOffset;
    delete division.dataset.techArcArmed;
    const staffUnit = division.closest(".staff-unit");
    if (staffUnit) renderArcLayer(staffUnit);
    return;
  }

  // --- Arm with no string (flow A: suri/oshi clicked before any tsubo) ---
  if (string == null) {
    console.log("ARMING with no string:", type);
    division.dataset.techArcArmed = type;
    delete division.dataset.techArcString;
    const staffUnit = division.closest(".staff-unit");
    if (staffUnit) renderArcLayer(staffUnit);
    return;
  }

  const layer = division.closest(".notation-layer");
  if (!layer) return;
  const staffUnit = division.closest(".staff-unit");
  const divisions = Array.from(layer.querySelectorAll(".time-division"));
  const startIndex = divisions.indexOf(division);
  if (startIndex === -1) return;

  // --- Try to resolve immediately ---
  const startSlot = [...division.querySelectorAll(".string-slot")].find(
    slot => slot.dataset.string === String(string) && slot.classList.contains("has-tsubo")
  );

  if (startSlot) {
    const targetString = type === "oshibachi" ? Number(string) + 1 : Number(string);
    for (let i = startIndex + 1; i < divisions.length; i++) {
      const slot = divisions[i].querySelector(`.string-slot[data-string="${targetString}"].has-tsubo`);
      if (slot) {
        const offset = i - startIndex;
        console.log("RESOLVED immediately:", type, string, offset);
        division.dataset.techArc       = type;
        division.dataset.techArcString = String(string);
        division.dataset.techArcOffset = String(offset);
        delete division.dataset.techArcArmed;
        if (staffUnit) renderArcLayer(staffUnit);
        return;
      }
    }
  }

  // --- Arm ---
  console.log("ARMING with string:", type, string);
  division.dataset.techArcArmed  = type;
  division.dataset.techArcString = String(string);

  // Partial resolution: store offset to nearest real target tsubo if one exists
  const partialTargetString = type === "oshibachi" ? Number(string) + 1 : Number(string);
  for (let i = startIndex + 1; i < divisions.length; i++) {
    const slot = divisions[i].querySelector(`.string-slot[data-string="${partialTargetString}"].has-tsubo`);
    if (slot) {
      division.dataset.techArcOffset = String(i - startIndex);
      break;
    }
  }

  if (staffUnit) renderArcLayer(staffUnit);
}


// --- Triplet ---
function commitTriplet(division) {
  if (!division) return;

  const layer = division.closest(".notation-layer");
  if (!layer) return;

  const divisions = Array.from(layer.querySelectorAll(".time-division"));

  // A triplet occupies exactly 3 consecutive divisions, all active.
  // --- Toggle off: from any triplet division ---
  const tripletPos = division.dataset.triplet;
  if (tripletPos === "1" || tripletPos === "2" || tripletPos === "3") {
    // Find division 1 of this group
    const offset = Number(tripletPos) - 1;
    const startIndex = divisions.indexOf(division) - offset;

    for (let i = startIndex; i < startIndex + 3; i++) {
      if (divisions[i]) {
        delete divisions[i].dataset.triplet;
        divisions[i].classList.remove("triplet-active");
      }
    }

    renderTripletBrackets();
    return;
  }

  // --- Toggle on ---
  const startIndex = divisions.indexOf(division);

  // Need 2 more divisions ahead (positions 2, 3)
  if (startIndex + 2 >= divisions.length) return;

  // Check none of the 3 divisions are already in a triplet
  for (let i = startIndex; i < startIndex + 3; i++) {
    if (divisions[i].dataset.triplet) return;
  }

  for (let i = 0; i < 3; i++) {
    divisions[startIndex + i].dataset.triplet = String(i + 1);
    divisions[startIndex + i].classList.add("triplet-active");
  }

  renderTripletBrackets();
}

// Single source of truth for .arc-layer rendering.
// Clears the layer, then redraws tech arcs AND triplet brackets from
// the time-division data attributes — so neither can erase the other.
function renderArcLayer(staffBlock) {
  const svg = staffBlock.querySelector(".arc-layer");
  if (!svg) return;

  svg.innerHTML = "";

  const divisions = Array.from(staffBlock.querySelectorAll(".time-division"));

  // --- Tech arcs ---
  divisions.forEach((division, startIndex) => {
    const type   = division.dataset.techArc;
    const string = division.dataset.techArcString;
    const offset = Number(division.dataset.techArcOffset);

    if (!type || !string || !offset) return;

    const startSlot = division.querySelector(
      `.string-slot[data-string="${string}"].has-tsubo`
    );
    if (!startSlot) return;

    const targetDivision = divisions[startIndex + offset];
    if (!targetDivision) return;

    const targetString =
      type === "oshibachi" ? Number(string) + 1 : Number(string);

    const targetSlot = targetDivision.querySelector(
      `.string-slot[data-string="${targetString}"].has-tsubo`
    );
    if (!targetSlot) return;

    const start = getSlotAnchor(startSlot);
    const end   = type === "oshibachi"
      ? getSlotAnchorMidLeft(targetSlot)
      : getSlotAnchor(targetSlot);
    if (!start || !end) return;

    drawArc(svg, start, end, type);
  });

  // --- Armed arcs (placeholder until fully resolved) ---
  divisions.forEach((division, startIndex) => {
    const type = division.dataset.techArcArmed;
    if (!type) return;

    const string = division.dataset.techArcString;

    // Start anchor: has-tsubo slot preferred, else bare string slot
    let start = null;
    if (string) {
      const startSlot = division.querySelector(`.string-slot[data-string="${string}"].has-tsubo`)
                     || division.querySelector(`.string-slot[data-string="${string}"]`);
      if (startSlot) start = getSlotAnchor(startSlot);
    }
    if (!start) return;

    // Target anchor: stored interim offset slot, or bare slot on next division
    const targetString = type === "oshibachi" ? Number(string) + 1 : Number(string);
    let end = null;
    const offset = division.dataset.techArcOffset ? Number(division.dataset.techArcOffset) : 0;

    const anchorFn = type === "oshibachi" ? getSlotAnchorMidLeft : getSlotAnchor;

    if (offset > 0) {
      const targetDiv = divisions[startIndex + offset];
      if (targetDiv) {
        const targetSlot = targetDiv.querySelector(`.string-slot[data-string="${targetString}"].has-tsubo`);
        if (targetSlot) end = anchorFn(targetSlot);
      }
    }
    if (!end) {
      const nextDiv = divisions[startIndex + 1];
      if (!nextDiv) return;
      const nextSlot = nextDiv.querySelector(`.string-slot[data-string="${targetString}"]`);
      if (!nextSlot) return;
      end = anchorFn(nextSlot);
    }
    if (!end) return;

    drawArc(svg, start, end, type);
  });

  // --- Triplet brackets (span divisions 1–3 of each group) ---
  divisions.forEach(division => {
    if (division.dataset.triplet !== "1") return;

    const startIndex = divisions.indexOf(division);
    const div1 = divisions[startIndex];
    const div3 = divisions[startIndex + 2];
    if (!div1 || !div3) return;

    const below1 = div1.querySelector(".below-zone");
    const below3 = div3.querySelector(".below-zone");
    if (!below1 || !below3) return;

    const layerRect = svg.closest(".notation-layer").getBoundingClientRect();
    const r1 = below1.getBoundingClientRect();
    const r3 = below3.getBoundingClientRect();

    const x1 = r1.left - layerRect.left;
    const x2 = r3.right - layerRect.left;
    const midY = r1.top - layerRect.top + r1.height / 2;
    const tickHalf = r1.height * 0.5;
    const midX = (x1 + x2) / 2;

    // Append "3" text first so getBoundingClientRect() returns real geometry
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", midX);
    text.setAttribute("y", midY);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "6");
    text.setAttribute("font-family", "IBM Plex Sans JP, sans-serif");
    text.classList.add("triplet-bracket");
    text.textContent = "3";
    svg.appendChild(text);

    const textRect = text.getBoundingClientRect();
    const textLeft  = textRect.left  - layerRect.left;
    const textRight = textRect.right - layerRect.left;
    const bracketGap = 2;

    const leftPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    leftPath.setAttribute("d",
      `M ${textLeft - bracketGap} ${midY} L ${x1} ${midY} M ${x1} ${midY - tickHalf} L ${x1} ${midY}`
    );
    leftPath.setAttribute("fill", "none");
    leftPath.setAttribute("stroke", "black");
    leftPath.setAttribute("stroke-width", "1");
    leftPath.classList.add("triplet-bracket");

    const rightPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    rightPath.setAttribute("d",
      `M ${textRight + bracketGap} ${midY} L ${x2} ${midY} M ${x2} ${midY - tickHalf} L ${x2} ${midY}`
    );
    rightPath.setAttribute("fill", "none");
    rightPath.setAttribute("stroke", "black");
    rightPath.setAttribute("stroke-width", "1");
    rightPath.classList.add("triplet-bracket");

    svg.appendChild(leftPath);
    svg.appendChild(rightPath);
  });

  // --- Dynamics (crescendo / decrescendo hairpins), lower edge of the below zone ---
  divisions.forEach((division, startIndex) => {
    const type = division.dataset.dynamic;
    const len  = Number(division.dataset.dynamicLength);
    if (!type || !(len >= 2)) return;

    const last  = divisions[startIndex + len - 1];
    const below = division.querySelector(".below-zone");
    if (!last || !below) return;

    const layerRect = svg.closest(".notation-layer").getBoundingClientRect();
    const mm = layerRect.width / 180;   // px per mm
    const r1 = division.getBoundingClientRect();
    const r2 = last.getBoundingClientRect();

    const x1   = r1.left  - layerRect.left + HAIRPIN.inset * mm;
    const x2   = r2.right - layerRect.left - HAIRPIN.inset * mm;
    const midY = below.getBoundingClientRect().top - layerRect.top + HAIRPIN.centreY * mm;
    const half = (HAIRPIN.opening / 2) * mm;

    // Crescendo: tip on the left, opens to the right. Decrescendo: the reverse.
    const [tipX, openX] = type === "cresc" ? [x1, x2] : [x2, x1];
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d",
      `M ${tipX} ${midY} L ${openX} ${midY - half} M ${tipX} ${midY} L ${openX} ${midY + half}`
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "black");
    path.setAttribute("stroke-width", "1");
    path.classList.add("dynamic-hairpin");
    svg.appendChild(path);
  });

  renderTextBoxes(staffBlock);
}

// Hairpin geometry in mm, relative to the top of the below zone (zone is 4mm tall).
// Lines at 2.317 and 3.865 (tip 3.091): with the 0.265mm stroke the lower edge stays
// inside the zone and the upper edge clears マ (ink ends 1.98 below the zone top) by
// 0.2mm and the triplet bracket line (at 2.0) by 0.05mm.
const HAIRPIN = { centreY: 3.091, opening: 1.548, inset: 0.8 };

// Hairpins are stored on their start division: data-dynamic + data-dynamic-length
function getDynamicSpans(staffUnit) {
  return Array.from(staffUnit.querySelectorAll(".time-division"))
    .filter(div => div.dataset.dynamic)
    .map(div => {
      const start = Number(div.dataset.timeIndex);
      return { div, start, end: start + Number(div.dataset.dynamicLength) - 1 };
    });
}

function removeDynamic(div) {
  delete div.dataset.dynamic;
  delete div.dataset.dynamicLength;
}

// Range: spans the selection. Single division: it and the next (division 32 → 31-32).
// Same type on the same span removes; other type converts; overlapping hairpins are replaced.
// Returns true if the unit changed.
function commitDynamic(type) {
  if (multiStaffSelection) return false;

  let staffUnit, start, end;
  if (multiDivisionSelection) {
    staffUnit = multiDivisionSelection.staffUnit;
    start = Math.min(multiDivisionSelection.startIndex, multiDivisionSelection.endIndex);
    end   = Math.max(multiDivisionSelection.startIndex, multiDivisionSelection.endIndex);
  } else if (selectedDivision) {
    staffUnit = selectedDivision.closest(".staff-unit");
    start = end = Number(selectedDivision.dataset.timeIndex);
  } else {
    return false;
  }
  if (!staffUnit || !staffUnit.isConnected) return false;
  if (start === end) { start = Math.min(start, 30); end = start + 1; }

  const spans = getDynamicSpans(staffUnit);
  const same  = spans.find(s => s.start === start && s.end === end);
  if (same) {
    if (same.div.dataset.dynamic === type) removeDynamic(same.div);
    else same.div.dataset.dynamic = type;
  } else {
    spans.filter(s => s.start <= end && s.end >= start).forEach(s => removeDynamic(s.div));
    const startDiv = staffUnit.querySelector(`.time-division[data-time-index="${start}"]`);
    startDiv.dataset.dynamic = type;
    startDiv.dataset.dynamicLength = String(end - start + 1);
  }

  renderArcLayer(staffUnit);
  return true;
}

// Clip copied/pasted hairpins: length limited to `maxLen`; dropped below 2
function clipDynamic(data, maxLen) {
  if (!data.dynamic) return;
  const n = Math.min(Number(data.dynamicLength), maxLen);
  if (n >= 2) data.dynamicLength = String(n);
  else { delete data.dynamic; delete data.dynamicLength; }
}

// --- Text boxes ---
// Stored on the start division: data-text-box (may be "") + data-text-box-length.
// Existence is marked by the length attribute.
const TEXT_BOX_DIV_MM = 180 / 32;   // width of one division in mm
const TEXT_BOX_BELOW_TOP_MM = 20;   // fallback: above 4 + tsubo 12 + clearance 4

function getTextBoxSpans(staffUnit) {
  return Array.from(staffUnit.querySelectorAll(".time-division"))
    .filter(div => div.dataset.textBoxLength !== undefined)
    .map(div => {
      const start = Number(div.dataset.timeIndex);
      return { div, start, end: start + Number(div.dataset.textBoxLength) - 1 };
    });
}

function removeTextBox(div) {
  delete div.dataset.textBox;
  delete div.dataset.textBoxLength;
}

// Same span rule and toggle as hairpins. Same span again removes (text included);
// otherwise overlapping boxes in the unit are replaced. Returns true if changed.
function commitTextBox() {
  if (multiStaffSelection) return false;

  let staffUnit, start, end;
  if (multiDivisionSelection) {
    staffUnit = multiDivisionSelection.staffUnit;
    start = Math.min(multiDivisionSelection.startIndex, multiDivisionSelection.endIndex);
    end   = Math.max(multiDivisionSelection.startIndex, multiDivisionSelection.endIndex);
  } else if (selectedDivision) {
    staffUnit = selectedDivision.closest(".staff-unit");
    start = end = Number(selectedDivision.dataset.timeIndex);
  } else {
    return false;
  }
  if (!staffUnit || !staffUnit.isConnected) return false;
  if (start === end) { start = Math.min(start, 30); end = start + 1; }

  const spans = getTextBoxSpans(staffUnit);
  const same  = spans.find(s => s.start === start && s.end === end);
  if (same) {
    removeTextBox(same.div);
  } else {
    spans.filter(s => s.start <= end && s.end >= start).forEach(s => removeTextBox(s.div));
    const startDiv = staffUnit.querySelector(`.time-division[data-time-index="${start}"]`);
    startDiv.dataset.textBox = "";
    startDiv.dataset.textBoxLength = String(end - start + 1);
  }

  renderArcLayer(staffUnit);
  return true;
}

// Clip copied/pasted text boxes: length limited to `maxLen`; dropped below 2
function clipTextBox(data, maxLen) {
  if (!data.textBoxLength) return;
  const n = Math.min(Number(data.textBoxLength), maxLen);
  if (n >= 2) data.textBoxLength = String(n);
  else { delete data.textBox; delete data.textBoxLength; }
}

// Rebuild the unit's text boxes from the division data. A focused box is mid-edit,
// so the whole rebuild is skipped while any of the unit's boxes has focus.
function renderTextBoxes(staffUnit) {
  const layer = staffUnit.querySelector(".notation-layer");
  if (!layer) return;

  const active = document.activeElement;
  if (active && active.classList.contains("text-box") && layer.contains(active)) return;

  layer.querySelectorAll(".text-box-clip").forEach(el => el.remove());

  const spans = getTextBoxSpans(staffUnit);
  if (!spans.length) return;

  const layerRect = layer.getBoundingClientRect();
  const below = layer.querySelector(".below-zone");
  let topMm = TEXT_BOX_BELOW_TOP_MM;
  if (below && layerRect.width > 0) {
    topMm = (below.getBoundingClientRect().top - layerRect.top) / (layerRect.width / 180);
  }

  spans.forEach(({ div, start }) => {
    const len = Number(div.dataset.textBoxLength);
    const leftMm = start * TEXT_BOX_DIV_MM;

    // Non-interactive wrapper: clips the overflowing text at position 32
    const clip = document.createElement("div");
    clip.className = "text-box-clip";
    clip.style.left   = `${leftMm}mm`;
    clip.style.width  = `${180 - leftMm}mm`;
    clip.style.top    = `${topMm}mm`;
    clip.style.height = "4mm";

    // Editable area is the box's own span width; text may overflow to the right
    const box = document.createElement("div");
    box.className = "text-box";
    box.contentEditable = "true";
    box.spellcheck = false;
    box.style.width = `${len * TEXT_BOX_DIV_MM}mm`;
    box.dataset.placeholder = STRINGS[currentLang]['text-box-placeholder'];
    box.textContent = div.dataset.textBox || "";

    let valueOnFocus = "";
    box.addEventListener("focus", () => { valueOnFocus = div.dataset.textBox || ""; });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); box.blur(); }
    });

    // Plain text only, single line
    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData?.getData("text/plain") || "").replace(/[\r\n]+/g, " ");
      document.execCommand("insertText", false, text);
    });

    box.addEventListener("input", () => {
      const text = box.textContent.replace(/[\r\n]+/g, "");
      // Clear a stray <br> left by the browser so :empty applies (placeholder)
      if (text === "" && box.innerHTML !== "") box.innerHTML = "";
      div.dataset.textBox = text;
      updateTextBoxClip(box);
    });

    box.addEventListener("blur", () => {
      if ((div.dataset.textBox || "") !== valueOnFocus) pushHistoryIfChanged();
    });

    clip.appendChild(box);
    layer.appendChild(clip);
    updateTextBoxClip(box);
    requestAnimationFrame(() => updateTextBoxClip(box));
  });
}

// Red "clipped" warning when the text runs past position 32 (the unit's right edge)
function updateTextBoxClip(box) {
  const layer = box.closest(".notation-layer");
  if (!layer || !box.isConnected) return;
  const layerRect = layer.getBoundingClientRect();
  let clipped = false;
  if (layerRect.width > 0 && box.textContent) {
    const range = document.createRange();
    range.selectNodeContents(box);
    clipped = range.getBoundingClientRect().right > layerRect.right + 0.5;
  }
  box.classList.toggle("clipped", clipped);
}

// Web fonts change text widths once loaded
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    document.querySelectorAll(".text-box").forEach(updateTextBoxClip);
  });
}

function renderTripletBrackets() {
  document.querySelectorAll(".staff-unit").forEach(renderArcLayer);
}

// --- Finger ---
function commitFinger(division, type) {
  if (!division) return;

  const zone = division.querySelector(".above-zone");
  if (!zone) return;

  // Always clear existing
  zone.innerHTML = "";

  // Persist finger state so save can read it from data attributes
  if (type) {
    division.dataset.finger = type;
  } else {
    delete division.dataset.finger;
  }

  // Null means "no finger"
  if (!type) return;

  const el = document.createElement("span");
  el.classList.add("finger-mark");

  if (type === "first") el.textContent = "Ⅰ";
  if (type === "second") el.textContent = "Ⅱ";
  if (type === "third") el.textContent = "Ⅲ";

  zone.appendChild(el);
}

// --- Commit clear functions ---
function commitClearDuration(division) {
  if (!division) return;

  delete division.dataset.durationUnderline;
  delete division.dataset.durationDot;

  const slots = Array.from(getStringSlots(division));
  slots.forEach(slot => {
    slot.classList.remove("single", "double", "dotted");
  });
}

function commitClearSlot(slot) {
  if (!slot) return;

  const division = getDivisionFromSlot(slot);

  slot.textContent = "";
  slot.classList.remove("has-tsubo", "has-rest");

  if (!division) return;

  // If the cleared slot was the start of a resolved arc, revert to armed
  if (division.dataset.techArc && division.dataset.techArcString === slot.dataset.string) {
    division.dataset.techArcArmed = division.dataset.techArc;
    delete division.dataset.techArc;
    delete division.dataset.techArcOffset;
    // keep techArcString so the placeholder knows which string to use
    const staffUnit = division.closest(".staff-unit");
    if (staffUnit) renderArcLayer(staffUnit);
  }

  // If no tsubo remain in this division, clear duration
  const slots = Array.from(getStringSlots(division));
  const hasAnyTsubo = slots.some(s => s.textContent !== "");

  if (!hasAnyTsubo) {
    commitClearDuration(division);
  }

  if (!hasAnyTsubo && division.dataset.techArcArmed) {
    delete division.dataset.techArcArmed;
    delete division.dataset.techArcString;
    delete division.dataset.techArcOffset;
    const staffUnit = division.closest(".staff-unit");
    if (staffUnit) renderArcLayer(staffUnit);
  }
}



function commitClearRest(division) {
  if (!division) return;

  const restSlot = getRestSlot(division);
  if (!restSlot.classList.contains("has-rest")) return;

  restSlot.textContent = "";
  restSlot.classList.remove("has-rest");
}

function commitClearDivision(division) {
  if (!division) return;

  // Hidden-but-saved marks: remove flags and glyphs before the slots are wiped
  for (const key of ["ha", "maebachi", "sukui", "hajiki", "keshi", "uchi"]) {
    delete division.dataset[key];
  }
  const below = division.querySelector(".below-zone");
  if (below) below.innerHTML = "";
  division.querySelectorAll(".sukui-mark, .hajiki-mark, .keshi-mark, .uchi-mark")
    .forEach(el => el.remove());

  getStringSlots(division).forEach(commitClearSlot);
  commitClearRest(division);
  commitClearDuration(division);

  // Clear above-zone
  const above = division.querySelector(".above-zone");
  if (above) above.innerHTML = "";
  delete division.dataset.finger;

  // Clear suri/oshibachi
  delete division.dataset.techArc;
  delete division.dataset.techArcString;
  delete division.dataset.techArcOffset;
  delete division.dataset.techArcArmed;

  // Clearing the start division removes its hairpin
  removeDynamic(division);
  removeTextBox(division);

  const staffUnit = division.closest(".staff-unit");
  if (staffUnit) renderArcLayer(staffUnit);

}


/* ======================================================
   Helper Utilities
====================================================== */

// Selection helpers
function getDivisionFromSlot(slot) {
  return slot.closest(".time-division");
}

function getStringSlots(division) {
  return division.querySelectorAll(".string-slot");
}

function getRestSlot(division) {
  return division.querySelector('.string-slot[data-string="2"]');
}

// Keyboard input helpers
function isTypingInHeader() {
  const active = document.activeElement;
  return active &&
    (active.tagName === "INPUT" ||
     active.tagName === "TEXTAREA" ||
     active.isContentEditable ||
     active.closest(".header-block"));
}

/* 
-------------------------------------------------------
  Bar line drawing helper
-------------------------------------------------------
*/

// Barlines
// Barline types that carry an editable repeat number
const REPEAT_NUMBER_TYPES = ["close-repeat", "double-repeat"];

function buildDefaultBarlines(bars) {
  const positions = [0, ...(BAR_TEMPLATES[bars] || []), 32];
  return positions.map(p => ({ pos: p }));
}

function drawBarlines(staffBlock) {
  const svg = staffBlock.querySelector(".staff-svg");
  if (!svg) return;

  svg.querySelectorAll(".barline-group").forEach(g => g.remove());

  const data = JSON.parse(staffBlock.dataset.barlines || "[]");
  const color = "#d3d3d3";

  // Geometry — all in mm, derived from staff line stroke width
  const thin  = 0.3;               // same as .staff-line stroke-width
  const thick = thin * 2;          // 0.6mm
  const dotR  = thick / 2;         // 0.3mm  (dot diameter = thick stroke width)
  const gap   = dotR * 2;          // 0.6mm  (gap = dot diameter)
  // offset from anchor centre to neighbour centre:
  //   thin half-width + gap + neighbour half-width
  const thickOff = thin / 2 + gap + thick / 2;   // 0.15 + 0.6 + 0.3 = 1.05mm
  const dotOff   = thin / 2 + gap + dotR;         // 0.15 + 0.6 + 0.3 = 1.05mm

  const greatStaff = staffBlock.dataset.greatStaff;

  data.forEach(bar => {
    const x = (bar.pos / 32) * 180;
    const type = bar.type || "normal";

    // Extend endpoint barlines for great staff grouping
    let y1 = 6, y2 = 14;
    if (greatStaff && (bar.pos === 0 || bar.pos === 32)) {
      if (greatStaff === "end"    || greatStaff === "middle") y1 = 0;
      if (greatStaff === "start"  || greatStaff === "middle") y2 = 25;
    }

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("barline-group");

    switch (type) {
      case "stop":
        // thin (anchor) → gap → thick (right)
        g.appendChild(makeLine(x,             y1, y2, color, `${thin}mm`));
        g.appendChild(makeLine(x + thickOff,  y1, y2, color, `${thick}mm`));
        break;

      case "open-repeat":
        // thick (left) → gap → thin (anchor) → gap → dots (right)
        g.appendChild(makeLine(x - thickOff,  y1, y2, color, `${thick}mm`));
        g.appendChild(makeLine(x,             y1, y2, color, `${thin}mm`));
        g.appendChild(makeCircle(x + dotOff,  8,  dotR, color));
        g.appendChild(makeCircle(x + dotOff, 12,  dotR, color));
        break;

      case "close-repeat":
        // dots (left) → gap → thin (anchor) → gap → thick (right)
        g.appendChild(makeCircle(x - dotOff,  8,  dotR, color));
        g.appendChild(makeCircle(x - dotOff, 12,  dotR, color));
        g.appendChild(makeLine(x,             y1, y2, color, `${thin}mm`));
        g.appendChild(makeLine(x + thickOff,  y1, y2, color, `${thick}mm`));
        break;

      case "double-repeat":
        // dots → gap → thin → gap → thick (centred on position, shared) → gap → thin → gap → dots
        g.appendChild(makeCircle(x - thickOff - dotOff,  8, dotR, color));
        g.appendChild(makeCircle(x - thickOff - dotOff, 12, dotR, color));
        g.appendChild(makeLine(x - thickOff,  y1, y2, color, `${thin}mm`));
        g.appendChild(makeLine(x,             y1, y2, color, `${thick}mm`));
        g.appendChild(makeLine(x + thickOff,  y1, y2, color, `${thin}mm`));
        g.appendChild(makeCircle(x + thickOff + dotOff,  8, dotR, color));
        g.appendChild(makeCircle(x + thickOff + dotOff, 12, dotR, color));
        break;

      case "normal":
      default:
        g.appendChild(makeLine(x, y1, y2, color, `${thin}mm`));
        break;
    }

    svg.appendChild(g);
  });

  // Repeat number boxes (close-repeat / double-repeat at positions 1-32), overlaid on the notation layer
  const layer = staffBlock.querySelector(".notation-layer");
  if (!layer) return;
  layer.querySelectorAll(".repeat-box").forEach(el => el.remove());
  data.forEach(bar => {
    if (REPEAT_NUMBER_TYPES.includes(bar.type) && bar.pos >= 1) {
      layer.appendChild(createRepeatBox(staffBlock, bar));
    }
  });
}

// Editable "×N" box, right-aligned to the barline in the above zone.
// Stores digits only (max 2) as bar.repeat; the "×" is added by CSS.
function createRepeatBox(staffBlock, bar) {
  const box = document.createElement("div");
  box.className = "repeat-box";
  box.contentEditable = "true";
  box.spellcheck = false;
  box.style.right = `${180 - (bar.pos / 32) * 180}mm`;
  box.textContent = bar.repeat || "";

  let valueOnFocus = "";
  box.addEventListener("focus", () => { valueOnFocus = box.textContent; });

  box.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); box.blur(); }
  });

  box.addEventListener("input", () => {
    const digits = box.textContent.replace(/\D/g, "").slice(0, 2);
    // Compare markup too, so a stray <br> left by the browser is cleared and :empty applies
    if (box.innerHTML !== digits) {
      box.textContent = digits;
      // Keep the caret at the end after sanitising
      const range = document.createRange();
      range.selectNodeContents(box);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const barlines = JSON.parse(staffBlock.dataset.barlines || "[]");
    const target = barlines.find(b => b.pos === bar.pos);
    if (!target) return;
    if (digits) target.repeat = digits;
    else delete target.repeat;
    staffBlock.dataset.barlines = JSON.stringify(barlines);
  });

  box.addEventListener("blur", () => {
    if (box.textContent !== valueOnFocus) pushHistory();
  });

  return box;
}

function makeLine(x, y1, y2, stroke, strokeWidth) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", `${x}mm`);
  line.setAttribute("y1", `${y1}mm`);
  line.setAttribute("x2", `${x}mm`);
  line.setAttribute("y2", `${y2}mm`);
  line.setAttribute("stroke", stroke);
  line.setAttribute("stroke-width", strokeWidth);
  return line;
}

function makeCircle(cx, cy, r, fill) {
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", `${cx}mm`);
  circle.setAttribute("cy", `${cy}mm`);
  circle.setAttribute("r", `${r}mm`);
  circle.setAttribute("fill", fill);
  return circle;
}


// Staff svg
function createStaffSVG(){
  const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.classList.add("staff-svg");
  svg.setAttribute("width","181mm");
  svg.setAttribute("height","20mm");

  const linesY = [6,10,14];

  linesY.forEach(y=>{
    const line = document.createElementNS("http://www.w3.org/2000/svg","line");
    line.setAttribute("x1","0mm");
    line.setAttribute("y1",`${y}mm`);
    line.setAttribute("x2","180mm");
    line.setAttribute("y2",`${y}mm`);
    line.setAttribute("class","staff-line");
    svg.appendChild(line);
  });

  return svg;
}

// Notation layer
function createNotationLayer(){
  const layer = document.createElement("div");
  layer.className = "notation-layer";

  const arcSVG = document.createElementNS("http://www.w3.org/2000/svg","svg");
  arcSVG.classList.add("arc-layer");
  layer.appendChild(arcSVG);

  for(let i=0;i<32;i++){
    const td = document.createElement("div");
    td.className = "time-division";
    td.dataset.timeIndex = i;

    const above = document.createElement("div");
    above.className = "above-zone";

    const tsubo = document.createElement("div");
    tsubo.className = "tsubo-zone";

    ["3","2","1"].forEach(s=>{
      const slot = document.createElement("div");
      slot.className = "string-slot";
      slot.dataset.string = s;
      tsubo.appendChild(slot);
    });

    const clearance = document.createElement("div");
    clearance.className = "clearance-row";

    const below = document.createElement("div");
    below.className = "below-zone";

    td.appendChild(above);
    td.appendChild(tsubo);
    td.appendChild(clearance);
    td.appendChild(below);

    layer.appendChild(td);
  }

  return layer;
}

// Template shortcut: replace all interior barlines (1-31) with normal barlines
// at the template positions. Positions 0 and 32 keep their current types.
function applyBarTemplate(staffBlock, bars) {
  const interior = BAR_TEMPLATES[bars];
  if (!interior) return;

  const ends = JSON.parse(staffBlock.dataset.barlines || "[]")
    .filter(b => b.pos === 0 || b.pos === 32);
  staffBlock.dataset.barlines = JSON.stringify(
    [...ends, ...interior.map(pos => ({ pos }))].sort((a, b) => a.pos - b.pos)
  );

  drawBarlines(staffBlock);
}

// Division-based editing: division k (1-based) acts on position k, its right edge.
// No barline → place; different type → change; same type → remove (32: no change).
// Division 1 cycles: position 0 → position 1 (0 reset to normal) → remove 1.
// Returns true if the unit changed.
function commitBarlineType(division, type) {
  const staffUnit = division.closest(".staff-unit");
  if (!staffUnit) return false;

  const k = Number(division.dataset.timeIndex) + 1;
  const barlines = JSON.parse(staffUnit.dataset.barlines || "[]");

  const typeAt = pos => {
    const bar = barlines.find(b => b.pos === pos);
    return bar ? (bar.type || "normal") : null;
  };
  const remove = pos => {
    const idx = barlines.findIndex(b => b.pos === pos);
    if (idx !== -1) barlines.splice(idx, 1);
  };
  const set = (pos, t) => {
    remove(pos);
    const bar = { pos };
    if (t !== "normal") bar.type = t;
    barlines.push(bar);
  };

  if (type === "double-repeat") {
    // Positions 1-31 only, plain toggle on the right edge (no division-1 cycle; position 0 untouched)
    if (k === 32) return false;
    if (typeAt(k) !== type) set(k, type);
    else                    remove(k);
  } else if (k === 1) {
    if (typeAt(1) === type)      { remove(1); set(0, "normal"); }
    else if (typeAt(0) === type) { set(0, "normal"); set(1, type); }
    else                         set(0, type);
  } else if (typeAt(k) !== type) {
    set(k, type);
  } else if (k === 32) {
    return false;
  } else {
    remove(k);
  }

  barlines.sort((a, b) => a.pos - b.pos);
  staffUnit.dataset.barlines = JSON.stringify(barlines);
  drawBarlines(staffUnit);
  return true;
}

// Staff units in the current selection: the multi-staff range, else the single selected unit
function getSelectedStaffUnits() {
  const allStaff = Array.from(document.querySelectorAll(".staff-unit"));
  if (multiStaffSelection) {
    const { startUnit, endUnit } = multiStaffSelection;
    const a = allStaff.indexOf(startUnit), b = allStaff.indexOf(endUnit);
    if (a === -1 || b === -1) return [];
    return allStaff.slice(Math.min(a, b), Math.max(a, b) + 1);
  }
  return selectedStaffUnit && allStaff.includes(selectedStaffUnit) ? [selectedStaffUnit] : [];
}

// Single toggle: any selected unit grouped → remove its group(s);
// otherwise two or more selected units → create a group. Returns true if changed.
function commitGreatStaffToggle() {
  const units = getSelectedStaffUnits();
  if (units.some(u => u.dataset.greatStaff)) return removeGreatStaffGroups(units);
  if (units.length < 2) return false;

  units.forEach((unit, i) => {
    delete unit.dataset.greatStaff;
    if (i === 0)                     unit.dataset.greatStaff = "start";
    else if (i === units.length - 1) unit.dataset.greatStaff = "end";
    else                             unit.dataset.greatStaff = "middle";
    drawBarlines(unit);
  });
  return true;
}

function removeGreatStaffGroups(units) {
  const allStaff = Array.from(document.querySelectorAll(".staff-unit"));
  const selectedUnits = new Set(units);
  let changed = false;

  // Walk all units to find contiguous great-staff groups containing a selected unit
  const groups = [];
  let currentGroup = null;
  allStaff.forEach(unit => {
    if (unit.dataset.greatStaff) {
      if (!currentGroup) currentGroup = [];
      currentGroup.push(unit);
    } else {
      if (currentGroup) { groups.push(currentGroup); currentGroup = null; }
    }
  });
  if (currentGroup) groups.push(currentGroup);

  groups.forEach(group => {
    if (group.some(u => selectedUnits.has(u))) {
      group.forEach(unit => {
        delete unit.dataset.greatStaff;
        drawBarlines(unit);
      });
      changed = true;
    }
  });
  return changed;
}

function updateBlankButton() {
  const btn = document.querySelector('[data-action="toggle-blank"]');
  if (!btn) return;
  const s = STRINGS[currentLang] || STRINGS.en;
  let firstUnit;
  if (multiStaffSelection) {
    const { startUnit, endUnit } = multiStaffSelection;
    const allStaff = Array.from(document.querySelectorAll(".staff-unit"));
    const lo = Math.min(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
    firstUnit = allStaff[lo];
  } else {
    firstUnit = selectedStaffUnit;
  }
  btn.textContent = firstUnit?.classList.contains('blank') ? s['palette-toggle-show'] : s['palette-toggle-blank'];
}

function commitToggleBlank() {
  if (multiStaffSelection) {
    const { startUnit, endUnit } = multiStaffSelection;
    const allStaff = Array.from(document.querySelectorAll(".staff-unit"));
    const lo = Math.min(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
    const hi = Math.max(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
    const units = allStaff.slice(lo, hi + 1);
    const makeBlank = !units[0].classList.contains('blank');
    units.forEach(u => {
      u.classList.toggle('blank', makeBlank);
      if (makeBlank) { u.dataset.blank = 'true'; } else { delete u.dataset.blank; }
    });
  } else {
    const unit = selectedStaffUnit;
    if (!unit) return;
    const isBlank = unit.classList.toggle('blank');
    if (isBlank) { unit.dataset.blank = 'true'; } else { delete unit.dataset.blank; }
  }
  updateBlankButton();
}


/*
-------------------------------------------------------
  Notation helpers
-------------------------------------------------------
*/

function isTsuboDigit(key) {
  return (
    (key >= "0" && key <= "9") ||
    key === "#"
  );
}

// On/off toggle helper
function toggleDatasetFlag(el, key) {
  const isOn = el.dataset[key] === "true";

  if (isOn) {
    delete el.dataset[key];
    return false;
  } else {
    el.dataset[key] = "true";
    return true;
  }
}

// Rotation toggle helpers
function rotateValue(current, values) {
  const index = values.indexOf(current);
  const nextIndex = (index + 1) % values.length;

  console.log(values[nextIndex]); // For debugging
  return values[nextIndex];
}

// Find the below slot marking anchor
function getBottomMostActiveSlot(division) {
  const slots = Array.from(getStringSlots(division));

  // 1. Prefer tsubo anchors (bottom-most first)
  const tsuboSlots = slots.filter(
    s => s.classList.contains("has-tsubo")
  );

  if (tsuboSlots.length > 0) {
    return tsuboSlots[tsuboSlots.length - 1];
  }

  // 2. Fallback: rest anchor
  const restSlot = slots.find(
    s => s.classList.contains("has-rest")
  );

  return restSlot ?? null;
}

// Oshibachi and suri helpers
function renderTechArcs() {
  document.querySelectorAll(".staff-unit").forEach(renderArcLayer);
}

function getSlotAnchor(slot) {
  if (!slot) return null;

  const rect = slot.getBoundingClientRect();
  const layer = slot.closest(".notation-layer");
  if (!layer) return null;

  const layerRect = layer.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2 - layerRect.left,
    y: rect.top - layerRect.top
  };
}

function getSlotAnchorMidLeft(slot) {
  if (!slot) return null;
  const rect = slot.getBoundingClientRect();
  const layer = slot.closest(".notation-layer");
  if (!layer) return null;
  const layerRect = layer.getBoundingClientRect();
  return {
    x: rect.left - layerRect.left,
    y: rect.top + rect.height / 3 - layerRect.top
  };
}

function getTargetSlot(startSlot, type) {
  if (!startSlot) return null;

  const startDivision = startSlot.closest(".time-division");
  const layer = startDivision.closest(".notation-layer");
  if (!layer) return null;

  const divisions = Array.from(
    layer.querySelectorAll(".time-division")
  );

  const startIndex = divisions.indexOf(startDivision);
  const startString = Number(startSlot.dataset.string);

  let targetString = startString;

  if (type === "oshibachi") {
    targetString = startString + 1;
    if (targetString > 3) return null;
  }

  for (let i = startIndex + 1; i < divisions.length; i++) {
    const slot = divisions[i].querySelector(
      `.string-slot[data-string="${targetString}"]`
    );

    if (!slot) continue;

    if (slot.classList.contains("has-tsubo")) {
      return slot;
    }
  }

  return null;
}


function drawArc(svg, start, end, type) {
  if (!svg || !start || !end) return;

  const midX = (start.x + end.x) / 2;
  const lift = 9;

  const path = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );

  if (type === "oshibachi") {
    path.setAttribute("d",
      `M ${start.x} ${start.y}
       L ${start.x} ${end.y}
       L ${end.x} ${end.y}`
    );
  } else {
    path.setAttribute("d",
      `M ${start.x} ${start.y}
       Q ${midX} ${Math.min(start.y, end.y) - lift}
         ${end.x} ${end.y}`
    );
  }

  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "black");
  path.setAttribute("stroke-width", "1");

  path.classList.add("tech-arc", type);

  svg.appendChild(path);
}

/*
======================================================
  File menu — New, Save, Open Print
======================================================
*/

function newPage(type) {
  const pages = document.querySelectorAll(".page");
  if (pages.length > 0) {
    if (!confirm("You have unsaved changes. Continue?")) return;
  }

  selectedSlot      = null;
  selectedDivision  = null;
  selectedStaffUnit = null;
  workspace.innerHTML = "";

  generatePage(type, 1);
  closeAllMenus();
  resetHistory();
}

document.getElementById("new-staff-page").addEventListener("click", () => newPage("staff"));
document.getElementById("new-lyric-page").addEventListener("click", () => newPage("lyric"));

/*
======================================================
  Save / Serialise
======================================================
*/

function serializeDocument() {
  // Header — read from the first page only (running headers mirror it)
  const firstHeader = document.querySelector(".page:first-child .header");
  const header = {};

  if (firstHeader) {
    const fieldMap = [
      ["dedication", ".dedication-field"],
      ["pageNumber",  ".page-number"],
      ["title",       ".title-field"],
      ["subtitle",    ".subtitle-field"],
      ["tuning",      ".tuning-field"],
      ["timeSig",     ".time-sig-field"],
      ["arranger",    ".arranger-field"],
    ];

    fieldMap.forEach(([key, sel]) => {
      const el = firstHeader.querySelector(sel);
      const text = el ? el.textContent.trim() : "";
      if (text) header[key] = text;
    });
  }

  // Pages
  const pages = [];
  document.querySelectorAll(".page").forEach(page => {
    const content = page.querySelector(".staff-page-content, .lyric-page-content");
    if (!content) return;

    const type = content.classList.contains("lyric-page-content") ? "lyric" : "staff";
    const blocks = [];

    content.querySelectorAll(".staff-unit, .lyric-unit").forEach(block => {
      if (block.classList.contains("staff-unit")) {
        blocks.push(serializeStaffUnit(block));
      } else {
        blocks.push(serializeLyricUnit(block));
      }
    });

    pages.push({ type, blocks });
  });

  return { header, pages };
}

function serializeStaffUnit(block) {
  const rawBarlines = JSON.parse(block.dataset.barlines || "[]");
  const barlines = rawBarlines.map(b => {
    const obj = { position: b.pos, type: b.type || "normal" };
    if (b.repeat) obj.repeat = b.repeat;
    return obj;
  });

  const timeDivisions = Array.from(
    block.querySelectorAll(".time-division")
  ).map(serializeTimeDivision);

  const result = { type: "staff-unit", barlines, timeDivisions };
  if (block.dataset.greatStaff) result.greatStaff = block.dataset.greatStaff;
  const barNumberText = block.querySelector(".bar-number")?.textContent?.trim();
  if (barNumberText) result.barNumber = barNumberText;
  const partLabelText = block.querySelector(".part-label")?.textContent?.trim();
  if (partLabelText) result.partLabel = partLabelText;
  if (block.dataset.blank === 'true') result.blank = true;
  return result;
}

function serializeTimeDivision(div) {
  const obj = {};

  // Rest
  if (div.querySelector(".string-slot.has-rest")) obj.rest = true;

  // Strings — only slots with tsubo content; rest marker excluded via has-tsubo
  const strings = [];
  div.querySelectorAll(".string-slot.has-tsubo").forEach(slot => {
    const tsubo = getSlotTsubo(slot);
    if (tsubo) strings.push({ string: Number(slot.dataset.string), tsubo });
  });
  if (strings.length) obj.strings = strings;

  // Duration
  if (div.dataset.durationUnderline) obj.durationUnderline = div.dataset.durationUnderline;
  if (div.dataset.durationDot === "true") obj.durationDot = true;

  // Technique boolean flags
  if (div.dataset.sukui    === "true") obj.sukui    = true;
  if (div.dataset.hajiki   === "true") obj.hajiki   = true;
  if (div.dataset.keshi    === "true") obj.keshi    = true;
  if (div.dataset.uchi     === "true") obj.uchi     = true;
  if (div.dataset.maebachi === "true") obj.maebachi = true;
  if (div.dataset.ha       === "true") obj.ha       = true;

  // Finger
  if (div.dataset.finger) obj.finger = div.dataset.finger;

  // Tech arc (suri / oshibachi)
  if (div.dataset.techArc) {
    obj.techArc       = div.dataset.techArc;
    obj.techArcString = div.dataset.techArcString;
    obj.techArcOffset = div.dataset.techArcOffset;
  }
  if (div.dataset.techArcArmed) {
    obj.techArcArmed  = div.dataset.techArcArmed;
    obj.techArcString = div.dataset.techArcString;
  }

  // Triplet
  if (div.dataset.triplet) obj.triplet = div.dataset.triplet;

  // Dynamic (hairpin), stored on its start division
  if (div.dataset.dynamic) {
    obj.dynamic       = div.dataset.dynamic;
    obj.dynamicLength = div.dataset.dynamicLength;
  }

  // Text box, stored on its start division (text only if non-empty)
  if (div.dataset.textBoxLength !== undefined) {
    if (div.dataset.textBox) obj.textBox = div.dataset.textBox;
    obj.textBoxLength = div.dataset.textBoxLength;
  }

  return obj;
}

// Return only the text-node content of a slot, ignoring technique-mark spans
function getSlotTsubo(slot) {
  for (const node of slot.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent.trim();
      if (t) return t;
    }
  }
  return "";
}

function serializeLyricUnit(block) {
  const lines = ["", "", ""];
  block.querySelectorAll(".lyric-line").forEach((line, i) => {
    if (i < 3) lines[i] = line.textContent;
  });
  return { type: "lyric-unit", lines };
}

function getFilename() {
  const titleEl = document.querySelector(".title-field");
  let name = titleEl ? titleEl.textContent.trim() : "";
  name = name.replace(/[/\\:*?"<>|]/g, "-");
  if (!name) name = "untitled";
  return name + ".shami";
}

function saveDocument() {
  const blob = new Blob(
    [JSON.stringify(serializeDocument(), null, 2)],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = getFilename();
  a.click();
  URL.revokeObjectURL(url);
}

/*
======================================================
  Open / Deserialise
======================================================
*/

// Hidden file input — created once, reused on every Open click
const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = ".shami";
fileInput.style.display = "none";
document.body.appendChild(fileInput);

document.getElementById("open-file").addEventListener("click", () => {
  closeAllMenus();
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  fileInput.value = ""; // reset so the same file can be re-opened

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      loadDocument(json);
    } catch (err) {
      console.error("Load failed:", err);
      alert("Failed to load file.");
    }
  };
  reader.readAsText(file);
});

function loadDocument(json) {
  const { header = {}, pages = [] } = json;

  // Null out stale selection references before clearing the DOM
  selectedSlot      = null;
  selectedDivision  = null;
  selectedStaffUnit = null;

  // Clear all existing pages
  workspace.innerHTML = "";

  // Rebuild each page then restore its blocks immediately
  pages.forEach((pageData, pageIndex) => {
    const pageNumber = pageIndex + 1;
    generatePage(pageData.type, pageNumber);

    const page = workspace.lastElementChild;
    const content = page.querySelector(".staff-page-content, .lyric-page-content");
    if (!content) return;

    const staffUnits = Array.from(content.querySelectorAll(".staff-unit"));
    const lyricUnits = Array.from(content.querySelectorAll(".lyric-unit"));
    let staffIdx = 0;
    let lyricIdx = 0;

    (pageData.blocks || []).forEach(block => {
      if (block.type === "staff-unit") {
        const staffUnit = staffUnits[staffIdx++];
        if (staffUnit) restoreStaffUnit(staffUnit, block);
      } else if (block.type === "lyric-unit") {
        const lyricUnit = lyricUnits[lyricIdx++];
        if (lyricUnit) restoreLyricUnit(lyricUnit, block);
      }
    });
  });

  // Restore header fields on the first page
  // (page-number is excluded — updatePageNumbers() manages it automatically)
  const firstHeader = document.querySelector(".page:first-child .header");
  if (firstHeader) {
    const fieldMap = [
      ["dedication", ".dedication-field"],
      ["title",      ".title-field"],
      ["subtitle",   ".subtitle-field"],
      ["tuning",     ".tuning-field"],
      ["timeSig",    ".time-sig-field"],
      ["arranger",   ".arranger-field"],
    ];
    fieldMap.forEach(([key, sel]) => {
      if (header[key] != null) {
        const el = firstHeader.querySelector(sel);
        if (el) el.textContent = header[key];
      }
    });
  }

  // Sync title to all running headers (setting textContent doesn't fire "input")
  const titleVal = header.title || "";
  document.querySelectorAll(".running-header .title-field").forEach(el => {
    el.textContent = titleVal;
  });
  if (!isRestoring) resetHistory();
}

function restoreStaffUnit(staffUnit, block) {
  // Barlines come from the saved data only; legacy "bars" is ignored.
  // Saved format: { position, type, repeat? } → internal format: { pos, type?, repeat? }
  const internalBarlines = (block.barlines || []).map(b => {
    const obj = { pos: b.position };
    if (b.type && b.type !== "normal") obj.type = b.type;
    if (b.repeat && REPEAT_NUMBER_TYPES.includes(b.type) && b.position >= 1) obj.repeat = String(b.repeat);
    return obj;
  });
  staffUnit.dataset.barlines = JSON.stringify(internalBarlines);

  if (block.greatStaff) {
    staffUnit.dataset.greatStaff = block.greatStaff;
  } else {
    delete staffUnit.dataset.greatStaff;
  }
  drawBarlines(staffUnit);

  // Restore all 32 time divisions
  const divisions = Array.from(staffUnit.querySelectorAll(".time-division"));
  (block.timeDivisions || []).forEach((divData, i) => {
    if (divisions[i]) restoreTimeDivision(divisions[i], divData);
  });

  // Single pass renders both tech arcs and triplet brackets from data attributes
  renderArcLayer(staffUnit);

  if (block.barNumber) {
    const el = staffUnit.querySelector(".bar-number");
    if (el) el.textContent = block.barNumber;
  }
  if (block.partLabel) {
    const el = staffUnit.querySelector(".part-label");
    if (el) el.textContent = block.partLabel;
  }
  if (block.blank) {
    staffUnit.classList.add('blank');
    staffUnit.dataset.blank = 'true';
  }
}

function restoreTimeDivision(div, data) {
  if (!data) return;

  // 1. Pitch — rest and tsubo are mutually exclusive in normal operation
  if (data.rest) {
    commitRest(div);
  } else if (data.strings) {
    data.strings.forEach(entry => {
      const slot = div.querySelector(`.string-slot[data-string="${entry.string}"]`);
      if (slot) commitTsubo(slot, entry.tsubo);
    });
  }

  // 2. Duration — underline before dot (commitDurationUnderline clears the dot internally)
  if (data.durationUnderline) commitDurationUnderline(div, data.durationUnderline);
  if (data.durationDot)       commitDurationDot(div);

  // 3. Technique booleans
  if (data.sukui)    commitSukui(div);
  if (data.hajiki)   commitHajiki(div);
  if (data.keshi)    commitKeshi(div);
  if (data.uchi)     commitUchi(div);
  if (data.maebachi) commitMaebachi(div);
  if (data.ha)       commitHa(div);

  // 4. Finger
  if (data.finger) commitFinger(div, data.finger);

  // 5. Tech arc — set attributes directly; renderArcLayer is called after all
  //    divisions are processed, so we don't call renderTechArcs() here
  if (data.techArc) {
    div.dataset.techArc       = data.techArc;
    div.dataset.techArcString = String(data.techArcString);
    div.dataset.techArcOffset = String(data.techArcOffset);
  }
  if (data.techArcArmed) {
    commitTechArc(div, data.techArcArmed, data.techArcString);
  }

  // 6. Triplet — set attributes and CSS classes directly; bracket drawn by renderArcLayer.
  // Only "1" | "2" | "3" are valid; anything else (e.g. legacy "disabled") is ignored.
  if (data.triplet === "1" || data.triplet === "2" || data.triplet === "3") {
    div.dataset.triplet = data.triplet;
    div.classList.add("triplet-active");
  }

  // 7. Dynamic (hairpin) — drawn by renderArcLayer. Invalid type, length < 2
  //    or a span running past index 31 is ignored.
  const dynLen = Number(data.dynamicLength);
  if ((data.dynamic === "cresc" || data.dynamic === "decresc") &&
      Number.isInteger(dynLen) && dynLen >= 2 &&
      Number(div.dataset.timeIndex) + dynLen - 1 <= 31) {
    div.dataset.dynamic       = data.dynamic;
    div.dataset.dynamicLength = String(dynLen);
  }

  // 8. Text box — drawn by renderArcLayer. Invalid length or a span running
  //    past index 31 is ignored; a non-string text becomes "".
  const boxLen = Number(data.textBoxLength);
  if (Number.isInteger(boxLen) && boxLen >= 2 &&
      Number(div.dataset.timeIndex) + boxLen - 1 <= 31) {
    div.dataset.textBox = typeof data.textBox === "string"
      ? data.textBox.replace(/[\r\n]+/g, "")
      : "";
    div.dataset.textBoxLength = String(boxLen);
  }
}

function restoreLyricUnit(unit, block) {
  const lines = block.lines || ["", "", ""];
  unit.querySelectorAll(".lyric-line").forEach((line, i) => {
    if (i < lines.length) line.textContent = lines[i];
  });
  // Older files may carry a lyric "blank" flag; it is ignored
}



/*
======================================================
  Edit menu — Undo, Redo, Copy, Paste
======================================================
*/







/*
======================================================
  Page menu — Clear Page, Delete Page
======================================================
*/

// Fully wipe a single time-division element and all its data
function clearDivisionFully(div) {
  div.querySelectorAll(".string-slot").forEach(slot => {
    slot.textContent = "";
    slot.classList.remove("has-tsubo", "has-rest", "single", "double", "dotted");
  });

  delete div.dataset.durationUnderline;
  delete div.dataset.durationDot;

  const above = div.querySelector(".above-zone");
  if (above) above.innerHTML = "";

  const below = div.querySelector(".below-zone");
  if (below) below.innerHTML = "";

  delete div.dataset.sukui;
  delete div.dataset.hajiki;
  delete div.dataset.keshi;
  delete div.dataset.uchi;
  delete div.dataset.maebachi;
  delete div.dataset.ha;
  delete div.dataset.finger;

  delete div.dataset.techArc;
  delete div.dataset.techArcString;
  delete div.dataset.techArcOffset;
  delete div.dataset.techArcArmed;

  delete div.dataset.triplet;
  div.classList.remove("triplet-active");

  removeDynamic(div);
  removeTextBox(div);
}

// Clear all notation content in a staff unit (barlines are left as-is)
function clearStaffUnitContent(staffUnit) {
  staffUnit.querySelectorAll(".time-division").forEach(clearDivisionFully);
  renderArcLayer(staffUnit);
}

document.getElementById("clear-page").addEventListener("click", () => {
  closeAllMenus();
  const input = prompt("Clear which page?");
  if (input === null) return;

  const n = parseInt(input);
  const pages = document.querySelectorAll(".page");
  const page = pages[n - 1];

  if (!page || isNaN(n) || n < 1) {
    alert(`Page ${n} not present for clearing.`);
    return;
  }

  page.querySelectorAll(".staff-unit").forEach(clearStaffUnitContent);
  page.querySelectorAll(".lyric-unit .lyric-line").forEach(line => {
    line.textContent = "";
  });
  pushHistoryIfChanged();
});

document.getElementById("delete-page").addEventListener("click", () => {
  closeAllMenus();
  const input = prompt("Delete which page?");
  if (input === null) return;

  const n = parseInt(input);
  const pages = document.querySelectorAll(".page");
  const page = pages[n - 1];

  if (!page || isNaN(n) || n < 1) {
    alert(`Page ${n} not present for deletion.`);
    return;
  }

  // Clear selection state for anything living on this page
  if (selectedSlot      && page.contains(selectedSlot))           { selectedSlot.classList.remove("selected");           selectedSlot = null; }
  if (selectedDivision  && page.contains(selectedDivision))       { selectedDivision.classList.remove("selected");       selectedDivision = null; }
  if (selectedStaffUnit && page.contains(selectedStaffUnit))      { selectedStaffUnit.classList.remove("selected-unit"); selectedStaffUnit = null; }

  page.remove();
  updatePageNumbers();
});

/*
======================================================
  Menu wiring
======================================================
*/

// File menu wiring
// Save button in File menu
document.getElementById("save-file").addEventListener("click", () => {
  closeAllMenus();
  saveDocument();
});

// Ctrl+S — works even when focus is in a header field
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    saveDocument();
  }
});

// Export/Print
document.getElementById("print-file").addEventListener("click", () => {
  window.print();
  closeAllMenus();
});


// Edit menu wiring
// Undo / Redo buttons
document.getElementById("edit-undo").addEventListener("click", () => {
  undoHistory();
  closeAllMenus();
});

document.getElementById("edit-redo").addEventListener("click", () => {
  redoHistory();
  closeAllMenus();
});

// Copy / Paste buttons
document.getElementById("edit-copy").addEventListener("click", () => {
  closeAllMenus();
  handleCopy();
});

document.getElementById("edit-paste").addEventListener("click", () => {
  closeAllMenus();
  handlePaste();
});

// Ctrl/Cmd+C and Ctrl/Cmd+V for copy/paste (not active when typing in header/lyric)
document.addEventListener("keydown", (e) => {
  if (isTypingInHeader()) return;
  if ((e.ctrlKey || e.metaKey) && e.key === "c") {
    if (multiDivisionSelection || multiStaffSelection || selectedDivision) {
      e.preventDefault();
      handleCopy();
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "v") {
    if (clipboard) {
      e.preventDefault();
      handlePaste();
    }
  }
});

// Page menu wiring
document.getElementById("add-staff-page").addEventListener("click", () => {
  const pageNumber = document.querySelectorAll(".page").length + 1;
  generatePage("staff", pageNumber);
  closeAllMenus();
});

document.getElementById("add-lyric-page").addEventListener("click", () => {
  const pageNumber = document.querySelectorAll(".page").length + 1;
  generatePage("lyric", pageNumber);
  closeAllMenus();
});


/*
======================================================
  Language / i18n
======================================================
*/

const HEADER_PLACEHOLDERS = {
  en: {
    'dedication-field': 'Dedication',
    'title-field':      'Title',
    'subtitle-field':   'Subtitle',
    'tuning-field':     'Tuning',
    'time-sig-field':   'Time',
    'arranger-field':   'Arranger',
  },
  ja: {
    'dedication-field': '献辞',
    'title-field':      'タイトル',
    'subtitle-field':   'サブタイトル',
    'tuning-field':     '調弦',
    'time-sig-field':   '拍子',
    'arranger-field':   '編曲者',
  }
};

const STRINGS = {
  en: {
    'lang-toggle':           '日本語',
    'data-menu-file':        'File',
    'data-menu-edit':        'Edit',
    'data-menu-page':        'Page',
    'about-btn':             'About',
    'info-btn':              'Instructions',
    'kofi-btn':              'Buy me a boba',
    'new-submenu':           'New ▶',
    'new-staff-page':        'Staff Page',
    'new-lyric-page':        'Staff and Lyric Page',
    'open-file':             'Open',
    'save-file':             'Save',
    'print-file':            'Export / Print',
    'edit-undo':             'Undo',
    'edit-redo':             'Redo',
    'edit-copy':             'Copy',
    'edit-paste':            'Paste',
    'add-staff-page':        'Add Staff Page',
    'add-lyric-page':        'Add Staff and Lyric Page',
    'clear-page':            'Clear Page',
    'delete-page':           'Delete Page',
    'metadata-bar-number':   'Bar',
    'metadata-part-label':   '…',
    'palette-header-tsubo':     'Tsubo',
    'palette-header-duration':  'Duration',
    'palette-header-technique': 'Technique',
    'palette-header-finger':    'Finger',
    'palette-header-measure':   'Measure',
    'palette-header-editing':      'Editing',
    'palette-header-misc':     'Misc',
    'palette-great-staff':     'Great staff',
    'palette-measure-0':     '0',
    'palette-measure-0-title': 'Remove all interior barlines',
    'palette-measure-2-title': '2 measures',
    'palette-measure-4-title': '4 measures',
    'palette-measure-8-title': '8 measures',
    'palette-barline-normal-title':        'Normal barline',
    'palette-barline-open-repeat-title':   'Open repeat',
    'palette-barline-close-repeat-title':  'Close repeat',
    'palette-barline-stop-title':          'Stop barline',
    'palette-barline-double-repeat-title': 'Double repeat',
    'palette-dynamic-cresc-title':   'Crescendo',
    'palette-dynamic-decresc-title': 'Decrescendo',
    'palette-text-box':       'Text',
    'palette-text-box-title': 'Text box',
    'text-box-placeholder':   'Text',
    'palette-clear':         'Clear',
    'palette-copy':          'Copy',
    'palette-paste':         'Paste',
    'palette-toggle-blank':  'Hide',
    'palette-toggle-show':   'Show',
    'watermark':             'Created with ShamiDō by ShamiWorks',
  },
  ja: {
    'lang-toggle':           'English',
    'data-menu-file':        'ファイル',
    'data-menu-edit':        '編集',
    'data-menu-page':        'ページ',
    'about-btn':             'アプリについて',
    'info-btn':              '使い方',
    'kofi-btn':              'ボバをおごる',
    'new-submenu':           '新規 ▶',
    'new-staff-page':        '譜面ページ',
    'new-lyric-page':        '譜面＋歌詞ページ',
    'open-file':             '開く',
    'save-file':             '保存',
    'print-file':            'エクスポート／印刷',
    'edit-undo':             '元に戻す',
    'edit-redo':             'やり直す',
    'edit-copy':             'コピー',
    'edit-paste':            '貼り付け',
    'add-staff-page':        '譜面ページを追加',
    'add-lyric-page':        '譜面＋歌詞ページを追加',
    'clear-page':            'ページをクリア',
    'delete-page':           'ページを削除',
    'metadata-bar-number':   '小節',
    'metadata-part-label':   '…',
    'palette-header-tsubo':     'ツボ',
    'palette-header-duration':  '音価',
    'palette-header-technique': '奏法',
    'palette-header-finger':    '指番号',
    'palette-header-measure':   '小節',
    'palette-header-editing':      '編集',
    'palette-header-misc':     'その他',
    'palette-great-staff':     '連合譜',
    'palette-measure-0':     '0',
    'palette-measure-0-title': '内部の小節線なし',
    'palette-measure-2-title': '16分割ごとに小節線（2小節）',
    'palette-measure-4-title': '8分割ごとに小節線（4小節）',
    'palette-measure-8-title': '4分割ごとに小節線（8小節）',
    'palette-barline-normal-title':        '通常の小節線',
    'palette-barline-open-repeat-title':   '反復開始記号',
    'palette-barline-close-repeat-title':  '反復終了記号',
    'palette-barline-stop-title':          '終止線',
    'palette-barline-double-repeat-title': '両側反復記号',
    'palette-dynamic-cresc-title':   'クレッシェンド',
    'palette-dynamic-decresc-title': 'デクレッシェンド',
    'palette-text-box':       'テキスト',
    'palette-text-box-title': 'テキストボックス',
    'text-box-placeholder':   'テキスト',
    'palette-clear':         'クリア',
    'palette-copy':          'コピー',
    'palette-paste':         '貼り付け',
    'palette-toggle-blank':  '非表示',
    'palette-toggle-show':   '表示',
    'watermark':             '三味ワークス「三味道」で作成',
  },

  lyricPlaceholders: {
  en: ["Lyric line 1", "Lyric line 2", "Lyric line 3"],
  ja: ["歌詞　１行目", "歌詞　２行目", "歌詞　３行目"]
}
};

let currentLang = 'en';

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  const s = STRINGS[lang];

  // Toggle button
  document.getElementById('lang-toggle').textContent = s['lang-toggle'];
  document.getElementById('logo-lang-toggle').textContent = s['lang-toggle'];

  // Menubar — data-menu buttons
  document.querySelector('[data-menu="file"]').textContent = s['data-menu-file'];
  document.querySelector('[data-menu="edit"]').textContent = s['data-menu-edit'];
  document.querySelector('[data-menu="page"]').textContent = s['data-menu-page'];

  // Menu-right buttons
  document.getElementById('about-btn').textContent = s['about-btn'];
  document.getElementById('info-btn').textContent  = s['info-btn'];
  document.getElementById('kofi-btn').textContent  = s['kofi-btn'];

  // Logo dropdown buttons
  document.getElementById('logo-about-btn').textContent = s['about-btn'];
  document.getElementById('logo-info-btn').textContent  = s['info-btn'];

  // File menu
  document.getElementById('new-submenu').textContent    = s['new-submenu'];
  document.getElementById('new-staff-page').textContent = s['new-staff-page'];
  document.getElementById('new-lyric-page').textContent = s['new-lyric-page'];
  document.getElementById('open-file').textContent      = s['open-file'];
  document.getElementById('save-file').textContent      = s['save-file'];
  document.getElementById('print-file').textContent     = s['print-file'];

  // Edit menu
  document.getElementById('edit-undo').textContent  = s['edit-undo'];
  document.getElementById('edit-redo').textContent  = s['edit-redo'];
  document.getElementById('edit-copy').textContent  = s['edit-copy'];
  document.getElementById('edit-paste').textContent = s['edit-paste'];

  // Page menu
  document.getElementById('add-staff-page').textContent = s['add-staff-page'];
  document.getElementById('add-lyric-page').textContent = s['add-lyric-page'];
  document.getElementById('clear-page').textContent     = s['clear-page'];
  document.getElementById('delete-page').textContent    = s['delete-page'];

  // Palette headers (in DOM order: Tsubo, Duration, Technique, Finger, Measure, Editing)
  const paletteHeaderKeys = [
    'palette-header-tsubo',
    'palette-header-duration',
    'palette-header-technique',
    'palette-header-finger',
    'palette-header-measure',
    'palette-header-misc',
    'palette-header-editing',
  ];
  document.querySelectorAll('.palette-header').forEach((el, i) => {
    if (paletteHeaderKeys[i]) el.textContent = s[paletteHeaderKeys[i]];
  });

  // Palette buttons
  document.querySelector('[data-action="measure"][data-value="0"]').textContent   = s['palette-measure-0'];
  ["0", "2", "4", "8"].forEach(v => {
    document.querySelector(`[data-action="measure"][data-value="${v}"]`).title = s[`palette-measure-${v}-title`];
  });
  ["normal", "open-repeat", "close-repeat", "stop", "double-repeat"].forEach(t => {
    document.querySelector(`[data-action="barline-type"][data-value="${t}"]`).title = s[`palette-barline-${t}-title`];
  });
  ["cresc", "decresc"].forEach(t => {
    document.querySelector(`[data-action="dynamic"][data-value="${t}"]`).title = s[`palette-dynamic-${t}-title`];
  });
  const textBoxBtn = document.querySelector('[data-action="text-box"]');
  textBoxBtn.textContent = s['palette-text-box'];
  textBoxBtn.title       = s['palette-text-box-title'];
  document.querySelectorAll('.text-box').forEach(el => {
    el.dataset.placeholder = s['text-box-placeholder'];
  });
  document.querySelector('[data-action="clear"]').textContent                     = s['palette-clear'];
  document.querySelector('[data-action="editing"][data-value="copy"]').textContent  = s['palette-copy'];
  document.querySelector('[data-action="editing"][data-value="paste"]').textContent = s['palette-paste'];
  document.querySelector('[data-action="toggle-blank"]').textContent               = s['palette-toggle-blank'];
  document.querySelector('[data-action="great-staff-toggle"]').textContent       = s['palette-great-staff'];

  // Watermarks (existing pages)
  document.querySelectorAll('.watermark').forEach(el => {
    el.textContent = s['watermark'];
  });

  // Info panel — elements with data-en / data-ja
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = el.dataset[lang];
  });

  // Header field placeholders (all pages)
  const placeholders = HEADER_PLACEHOLDERS[lang] || HEADER_PLACEHOLDERS.en;
  Object.entries(placeholders).forEach(([cls, text]) => {
    document.querySelectorAll(`.${cls}`).forEach(el => {
      el.dataset.placeholder = text;
    });
  });

  // Lyric line placeholders
  document.querySelectorAll('.lyric-line').forEach(el => {
    const i = parseInt(el.dataset.line) - 1;
    el.dataset.placeholder = STRINGS.lyricPlaceholders[lang][i];
  });

  // Staff metadata placeholders
  document.querySelectorAll('.bar-number').forEach(el => {
    el.dataset.placeholder = s['metadata-bar-number'];
  });
  document.querySelectorAll('.part-label').forEach(el => {
    el.dataset.placeholder = s['metadata-part-label'];
  });
}

// About button — open correct page for active language
document.getElementById('about-btn').addEventListener('click', () => {
  window.open(currentLang === 'ja' ? 'about-ja.html' : 'about.html', '_blank');
});

// Lang toggle button
document.getElementById('lang-toggle').addEventListener('click', () => {
  setLanguage(currentLang === 'en' ? 'ja' : 'en');
});

// Logo dropdown toggle
const logoDropdownToggle = document.getElementById('logo-dropdown-toggle');
const logoDropdown = document.querySelector('.logo-dropdown');

logoDropdownToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  logoDropdown.classList.toggle('open');
});

logoDropdown.addEventListener('click', (e) => e.stopPropagation());

document.addEventListener('click', () => {
  logoDropdown.classList.remove('open');
});

// Logo dropdown button wiring
document.getElementById('logo-lang-toggle').addEventListener('click', () => {
  setLanguage(currentLang === 'en' ? 'ja' : 'en');
  logoDropdown.classList.remove('open');
});

document.getElementById('logo-about-btn').addEventListener('click', () => {
  window.open(currentLang === 'ja' ? 'about-ja.html' : 'about.html', '_blank');
  logoDropdown.classList.remove('open');
});

document.getElementById('logo-info-btn').addEventListener('click', () => {
  infoPanel.classList.toggle('open');
  logoDropdown.classList.remove('open');
});

// Init on load
setLanguage(localStorage.getItem('lang') || 'en');

// Seed initial history state
resetHistory();


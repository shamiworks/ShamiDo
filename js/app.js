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

const BAR_TEMPLATES = {
  0: [0, 32],
  2: [0, 16, 32],
  4: [0, 8, 16, 24, 32],
  8: [0, 4, 8, 12, 16, 20, 24, 28, 32]
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
  block.dataset.bars = 4;
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
let selectedBarline = null;

let multiDivisionSelection = null; // { staffUnit, startIndex, endIndex }
let multiDivisionAnchor    = null; // integer index — held across shift+clicks
let multiStaffSelection    = null; // { startUnit, endUnit }
let multiStaffAnchor       = null; // integer index — held across shift+clicks
let clipboard              = null; // { type: "divisions"|"staffUnits", data: [...] }

let dragAnchorDivision = null;
let isDragging = false;
let isDragStaffMode = false;

workspace.addEventListener("click", (e) => {
  // Suppress click when a drag just ended
  if (isDragging) { isDragging = false; return; }

  // Alt+click on barline hit target → select barline only
  // Use elementsFromPoint so hit rects in .staff-svg (z-index 1) are found
  // even when .notation-layer (z-index 2) intercepts the event target.
  if (e.altKey) {
    const hit = document.elementsFromPoint(e.clientX, e.clientY)
      .find(el => el.classList.contains("barline-hit"));
    if (hit) {
      const staffUnit = hit.closest(".staff-unit");
      if (staffUnit) {
        selectBarline(staffUnit, parseInt(hit.dataset.posIndex));
        return;
      }
    }
  }

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
        deselectBarline();
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
        deselectBarline();
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

  // Any other click clears barline selection
  deselectBarline();

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
    deselectBarline();
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
  deselectBarline();
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

function selectBarline(staffUnit, posIndex) {
  const prev = selectedBarline;
  selectedBarline = { staffUnit, posIndex };
  if (prev && prev.staffUnit !== staffUnit) {
    drawBarlines(prev.staffUnit);
  }
  drawBarlines(staffUnit);
}

function deselectBarline() {
  if (!selectedBarline) return;
  const { staffUnit } = selectedBarline;
  selectedBarline = null;
  drawBarlines(staffUnit);
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

  // Multi-selection clear
  if ((e.key === "Backspace" || e.key === "Delete") && (multiDivisionSelection || multiStaffSelection)) {
    e.preventDefault();
    handleMultiClear();
    return;
  }

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
    // Moving up from string 3 — find previous selectable unit
    for (let i = currentUnitIndex - 1; i >= 0; i--) {
      const unit = allUnits[i];
      if (unit.classList.contains("staff-unit")) {
        const layer = unit.querySelector(".notation-layer");
        const targetDiv = layer?.querySelector(`.time-division[data-time-index="${timeIndex}"]`);
        const slot = targetDiv?.querySelector('.string-slot[data-string="3"]');
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
    // Moving down from string 1 — find next selectable unit
    for (let i = currentUnitIndex + 1; i < allUnits.length; i++) {
      const unit = allUnits[i];
      if (unit.classList.contains("staff-unit")) {
        const layer = unit.querySelector(".notation-layer");
        const targetDiv = layer?.querySelector(`.time-division[data-time-index="${timeIndex}"]`);
        const slot = targetDiv?.querySelector('.string-slot[data-string="1"]');
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

function handleMultiClear() {
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
    clipboard = { type: "divisions", data };
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
    clipboard = { type: "divisions", data: [serializeTimeDivision(selectedDivision)] };
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
      if (target) { clearDivisionFully(target); restoreTimeDivision(target, divData); }
    });
    const staffUnit = layer.closest(".staff-unit");
    if (staffUnit) renderArcLayer(staffUnit);
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
  }
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
let currentDurationUnderline = null;
let lastDurationDivision = null;

const FINGER_ROTATION = [null, "first", "second", "third"];
let currentFinger = null;
let lastFingerDivision = null;

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

  if (!selectedSlot && !selectedDivision) return;

  const intent = keyToIntent(e);
  if (!intent) return;

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
    if (selectedDivision !== lastDurationDivision) {
      currentDurationUnderline = null;
      lastDurationDivision = selectedDivision;
    }

    currentDurationUnderline = rotateValue(
      currentDurationUnderline,
      DURATION_UNDERLINE_ROTATION
    );

    dispatchCommit({
      source: "keyboard",
      action: "duration-underline",
      value: currentDurationUnderline
    });
  }

  // Finger handling
  if (intent.action === "finger-rotate") {
    if (selectedDivision !== lastFingerDivision) {
      currentFinger = null;
      lastFingerDivision = selectedDivision;
    }

    currentFinger = rotateValue(
      currentFinger,
      FINGER_ROTATION
    );

    dispatchCommit({
      source: "keyboard",
      action: "finger",
      value: currentFinger
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

  if (e.key === "Backspace") {
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

  // Sync keyboard rotation state with explicit palette choice
  if (action === "duration-underline") {
    currentDurationUnderline = value;
    lastDurationDivision = selectedDivision;
  }

  if (action === "duration-empty") {
    commitClearDuration(selectedDivision);
  }

  if (action === "finger") {
    currentFinger = value;
    lastFingerDivision = selectedDivision;
  }

  // Copy / Paste from palette
  if (action === "editing") {
    if (value === "copy")  handleCopy();
    if (value === "paste") handlePaste();
    return;
  }

  if (action === "great-staff-add")    { commitGreatStaffAdd();    return; }
  if (action === "great-staff-remove") { commitGreatStaffRemove(); return; }
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
      setStaffBars(selectedStaffUnit, bars);
    }
    pushHistory();
    return;
  }

  if (intent.action === "barline-type") {
    commitBarlineType(intent.value);
    pushHistory();
    return;
  }

  if (!selectedDivision) return;

  if (selectedDivision.dataset.triplet === "disabled" && intent.action !== "triplet") return;

  switch (intent.action) {
    case "tsubo":
      if (!selectedSlot) return;
      commitTsubo(selectedSlot, intent.value);
      break;

    case "rest":
      commitRest(selectedDivision);
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

    case "clear":
      if (selectedDivision.dataset.triplet) {
        commitTriplet(selectedDivision);
      } else if (selectedSlot) {
        commitClearSlot(selectedSlot);
      } else {
        commitClearDivision(selectedDivision);
      }
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

  zone.innerHTML = isNowOn ? "前" : "";
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

  // --- Toggle off: from any active triplet division ---
  const tripletPos = division.dataset.triplet;
  if (tripletPos === "1" || tripletPos === "2" || tripletPos === "3") {
    // Find division 1 of this group
    const timeIndex = Number(division.dataset.timeIndex);
    const offset = Number(tripletPos) - 1;
    const startIndex = divisions.indexOf(division) - offset;

    for (let i = startIndex; i < startIndex + 4; i++) {
      if (divisions[i]) {
        delete divisions[i].dataset.triplet;
        divisions[i].classList.remove("triplet-active", "triplet-disabled");
      }
    }

    renderTripletBrackets();
    return;
  }

  // --- Toggle on ---
  const startIndex = divisions.indexOf(division);

  // Need 3 more divisions ahead (positions 2, 3, 4)
  if (startIndex + 3 >= divisions.length) return;

  // Check none of the 4 divisions are already in a triplet
  for (let i = startIndex; i < startIndex + 4; i++) {
    if (divisions[i].dataset.triplet) return;
  }

  divisions[startIndex].dataset.triplet     = "1";
  divisions[startIndex + 1].dataset.triplet = "2";
  divisions[startIndex + 2].dataset.triplet = "3";
  divisions[startIndex + 3].dataset.triplet = "disabled";

  divisions[startIndex].classList.add("triplet-active");
  divisions[startIndex + 1].classList.add("triplet-active");
  divisions[startIndex + 2].classList.add("triplet-active");
  divisions[startIndex + 3].classList.add("triplet-disabled");

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
    const end   = getSlotAnchor(targetSlot);
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

    if (offset > 0) {
      const targetDiv = divisions[startIndex + offset];
      if (targetDiv) {
        const targetSlot = targetDiv.querySelector(`.string-slot[data-string="${targetString}"].has-tsubo`);
        if (targetSlot) end = getSlotAnchor(targetSlot);
      }
    }
    if (!end) {
      const nextDiv = divisions[startIndex + 1];
      if (!nextDiv) return;
      const nextSlot = nextDiv.querySelector(`.string-slot[data-string="${targetString}"]`);
      if (!nextSlot) return;
      end = getSlotAnchor(nextSlot);
    }
    if (!end) return;

    drawArc(svg, start, end, type);
  });

  // --- Triplet brackets ---
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
function buildDefaultBarlines(bars) {
  const positions = BAR_TEMPLATES[bars] || [0, 32];
  return positions.map(p => ({ pos: p }));
}

function drawBarlines(staffBlock) {
  const svg = staffBlock.querySelector(".staff-svg");
  if (!svg) return;

  svg.querySelectorAll(".barline-group").forEach(g => g.remove());

  const data = JSON.parse(staffBlock.dataset.barlines || "[]");
  const isSelectedUnit = selectedBarline && selectedBarline.staffUnit === staffBlock;

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

  data.forEach((bar, i) => {
    const x = (bar.pos / 32) * 180;
    const type = bar.type || "normal";
    const isSelected = isSelectedUnit && selectedBarline.posIndex === i;
    const color = isSelected ? "dodgerblue" : "#d3d3d3";

    // Extend endpoint barlines for great staff grouping
    let y1 = 6, y2 = 14;
    if (greatStaff && (bar.pos === 0 || bar.pos === 32)) {
      if (greatStaff === "end"    || greatStaff === "middle") y1 = 0;
      if (greatStaff === "start"  || greatStaff === "middle") y2 = 25;
    }

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("barline-group");

    // Transparent hit target (retrieved via elementsFromPoint on Alt+click)
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    hit.setAttribute("x", `${x - 3}mm`);
    hit.setAttribute("y", "5mm");
    hit.setAttribute("width", "6mm");
    hit.setAttribute("height", "10mm");
    hit.setAttribute("fill", "transparent");
    hit.setAttribute("pointer-events", "all");
    hit.classList.add("barline-hit");
    hit.dataset.posIndex = i;
    g.appendChild(hit);

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

      case "normal":
      default:
        g.appendChild(makeLine(x, y1, y2, color, `${thin}mm`));
        break;
    }

    svg.appendChild(g);
  });
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

// Bar counting and numbering
function setStaffBars(staffBlock, bars) {
  if (!BAR_TEMPLATES[bars]) return;

  staffBlock.dataset.bars = bars;
  staffBlock.dataset.barlines = JSON.stringify(buildDefaultBarlines(bars));

  drawBarlines(staffBlock);
}

function commitBarlineType(type) {
  if (!selectedBarline) return;
  const { staffUnit, posIndex } = selectedBarline;

  const barlines = JSON.parse(staffUnit.dataset.barlines || "[]");
  if (!barlines[posIndex]) return;

  if (type === "normal") {
    delete barlines[posIndex].type;
  } else {
    barlines[posIndex].type = type;
  }

  staffUnit.dataset.barlines = JSON.stringify(barlines);
  selectedBarline = null;
  drawBarlines(staffUnit);
}

function commitGreatStaffAdd() {
  if (!multiStaffSelection) return;
  const { startUnit, endUnit } = multiStaffSelection;
  const allStaff = Array.from(document.querySelectorAll(".staff-unit"));
  const lo = Math.min(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
  const hi = Math.max(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
  if (lo === hi) return;

  for (let i = lo; i <= hi; i++) {
    const unit = allStaff[i];
    if (!unit) continue;
    delete unit.dataset.greatStaff;
    if (i === lo)       unit.dataset.greatStaff = "start";
    else if (i === hi)  unit.dataset.greatStaff = "end";
    else                unit.dataset.greatStaff = "middle";
    drawBarlines(unit);
  }
}

function commitGreatStaffRemove() {
  const allStaff = Array.from(document.querySelectorAll(".staff-unit"));

  const selectedUnits = new Set();
  if (selectedStaffUnit) selectedUnits.add(selectedStaffUnit);
  if (multiStaffSelection) {
    const { startUnit, endUnit } = multiStaffSelection;
    const lo = Math.min(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
    const hi = Math.max(allStaff.indexOf(startUnit), allStaff.indexOf(endUnit));
    for (let i = lo; i <= hi; i++) {
      if (allStaff[i]) selectedUnits.add(allStaff[i]);
    }
  }
  if (selectedUnits.size === 0) return;

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
    }
  });
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
    firstUnit = selectedStaffUnit || document.activeElement?.closest('.lyric-unit');
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
    const unit = selectedStaffUnit || document.activeElement?.closest('.lyric-unit');
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

  path.setAttribute(
    "d",
    `M ${start.x} ${start.y}
     Q ${midX} ${Math.min(start.y, end.y) - lift}
       ${end.x} ${end.y}`
  );

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
  selectedBarline   = null;
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
  const bars = Number(block.dataset.bars);

  const rawBarlines = JSON.parse(block.dataset.barlines || "[]");
  const barlines = rawBarlines.map(b => ({
    position: b.pos,
    type: b.type || "normal"
  }));

  const timeDivisions = Array.from(
    block.querySelectorAll(".time-division")
  ).map(serializeTimeDivision);

  const result = { type: "staff-unit", bars, barlines, timeDivisions };
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
  const result = { type: "lyric-unit", lines };
  if (block.dataset.blank === 'true') result.blank = true;
  return result;
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
  selectedBarline   = null;

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
  // Reset to saved bar count (also resets barlines to default positions)
  setStaffBars(staffUnit, block.bars);

  // Overwrite barlines with the saved data
  // Saved format: { position, type } → internal format: { pos, type? }
  const internalBarlines = (block.barlines || []).map(b => {
    const obj = { pos: b.position };
    if (b.type && b.type !== "normal") obj.type = b.type;
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

  // 6. Triplet — set attributes and CSS classes directly; bracket drawn by renderArcLayer
  if (data.triplet) {
    div.dataset.triplet = data.triplet;
    if (data.triplet === "disabled") {
      div.classList.add("triplet-disabled");
    } else {
      div.classList.add("triplet-active");
    }
  }
}

function restoreLyricUnit(unit, block) {
  const lines = block.lines || ["", "", ""];
  unit.querySelectorAll(".lyric-line").forEach((line, i) => {
    if (i < lines.length) line.textContent = lines[i];
  });
  if (block.blank) {
    unit.classList.add('blank');
    unit.dataset.blank = 'true';
  }
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

  delete div.dataset.triplet;
  div.classList.remove("triplet-active", "triplet-disabled");
}

// Clear all notation content in a staff unit and reset barlines to defaults
function clearStaffUnitContent(staffUnit) {
  staffUnit.querySelectorAll(".time-division").forEach(clearDivisionFully);
  renderArcLayer(staffUnit);

  const bars = parseInt(staffUnit.dataset.bars);
  staffUnit.dataset.barlines = JSON.stringify(buildDefaultBarlines(bars));
  drawBarlines(staffUnit);
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
  if (selectedBarline   && page.contains(selectedBarline.staffUnit)) selectedBarline = null;

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
    'palette-header-great-staff':  'Great staff',
    'palette-btn-great-staff-add': 'Add great staff',
    'palette-btn-great-staff-remove': 'Remove great staff',
    'palette-measure-0':     'Free',
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
    'palette-header-great-staff':  '連合譜',
    'palette-btn-great-staff-add': '連合譜を追加',
    'palette-btn-great-staff-remove': '連合譜を削除',
    'palette-measure-0':     'フリー',
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
    'palette-header-great-staff',
    'palette-header-editing',
  ];
  document.querySelectorAll('.palette-header').forEach((el, i) => {
    if (paletteHeaderKeys[i]) el.textContent = s[paletteHeaderKeys[i]];
  });

  // Palette buttons
  document.querySelector('[data-action="measure"][data-value="0"]').textContent   = s['palette-measure-0'];
  document.querySelector('[data-action="clear"]').textContent                     = s['palette-clear'];
  document.querySelector('[data-action="editing"][data-value="copy"]').textContent  = s['palette-copy'];
  document.querySelector('[data-action="editing"][data-value="paste"]').textContent = s['palette-paste'];
  document.querySelector('[data-action="toggle-blank"]').textContent               = s['palette-toggle-blank'];
  document.querySelector('[data-action="great-staff-add"]').title    = s['palette-btn-great-staff-add'];
  document.querySelector('[data-action="great-staff-remove"]').title = s['palette-btn-great-staff-remove'];

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


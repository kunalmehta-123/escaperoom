// ============================
// Valentine Escape — script.js
// One-page sections: home, room1 (timeline), room2 (10x10 word search), room3 (map), room4 (finale)
// ============================

const TOTAL_ROOMS = 3;

// ======================
// HUD: meter + timer
// ======================
let completedRooms = 0;
let timerInterval = null;
let roomStartTs = null;

function setMeter(completed, total) {
  completedRooms = completed;

  const textEl = document.getElementById("meterText");
  const fillEl = document.getElementById("meterFill");
  const barEl = document.querySelector(".meterBar");

  if (textEl) textEl.textContent = `${completed} / ${total}`;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  if (fillEl) fillEl.style.width = `${pct}%`;
  if (barEl) barEl.setAttribute("aria-valuenow", String(completed));
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function startRoomTimer(label) {
  const labelEl = document.getElementById("timerLabel");
  const valueEl = document.getElementById("timerValue");

  if (timerInterval) clearInterval(timerInterval);
  roomStartTs = Date.now();
  if (labelEl) labelEl.textContent = label;

  const tick = () => {
    const ms = Date.now() - roomStartTs;
    if (valueEl) valueEl.textContent = fmtTime(ms);
  };
  tick();
  timerInterval = setInterval(tick, 250);
}

function stopTimerToIdle() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  roomStartTs = null;

  const labelEl = document.getElementById("timerLabel");
  const valueEl = document.getElementById("timerValue");
  if (labelEl) labelEl.textContent = "Timer";
  if (valueEl) valueEl.textContent = "00:00";
}

// ======================
// Navigation: section swap
// ======================
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");

  if (id === "room1") startRoomTimer("Room 1");
  else if (id === "room2") startRoomTimer("Room 2");
  else if (id === "room3") startRoomTimer("Room 3");
  else if (id === "room4") startRoomTimer("Finale");
  else stopTimerToIdle();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ======================
// Full-screen unlock overlay
// ======================
function showUnlockOverlay(title, sub, onDone) {
  const overlay = document.getElementById("unlockOverlay");
  const titleEl = document.getElementById("unlockTitle");
  const subEl = document.getElementById("unlockSub");
  const fx = document.getElementById("unlockBigFx");

  if (!overlay || !titleEl || !subEl || !fx) {
    onDone?.();
    return;
  }

  titleEl.textContent = title || "Unlocked";
  subEl.textContent = sub || "Entering the next room…";

  overlay.classList.remove("hidden");

  // restart FX
  fx.classList.add("hidden");
  void fx.offsetWidth;
  fx.classList.remove("hidden");

  setTimeout(() => {
    overlay.classList.add("hidden");
    onDone?.();
  }, 950);
}

// ======================
// ROOM 1 — Timeline
// ======================
const ROOM1 = {
  correctOrder: [
    "Decades / Westwood",
    "D&B",
    "You watch party",
    "Kinara / Cocktail Making",
    "Rohit talk",
    "First time at LOJ",
    "Meeting my parents",
    "Meeting your parents",
    "LA Trip",
    "Houston",
  ]
};

let r1ShuffledStart = [];
let r1Code = "";
let r1Completed = false;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sameOrder(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function getCurrentOrder(listEl) {
  return [...listEl.querySelectorAll(".item")].map(el => el.dataset.value);
}

function getDragAfterElement(container, y) {
  const draggable = [...container.querySelectorAll(".item:not(.dragging)")];
  return draggable.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function renderTimeline(listEl, items) {
  listEl.innerHTML = "";
  items.forEach(text => {
    const li = document.createElement("li");
    li.className = "item";
    li.draggable = true;
    li.dataset.value = text;
    li.innerHTML = `
      <span class="handle">⠿</span>
      <span class="label">${text}</span>
      <span class="hint">drag</span>
    `;
    li.addEventListener("dragstart", () => li.classList.add("dragging"));
    li.addEventListener("dragend", () => li.classList.remove("dragging"));
    listEl.appendChild(li);
  });
}

function buildRoom1Code() {
  return ROOM1.correctOrder.map(e => r1ShuffledStart.indexOf(e)).join("");
}

function initRoom1() {
  const listEl = document.getElementById("timelineList");
  const checkBtn = document.getElementById("r1CheckBtn");
  const shuffleBtn = document.getElementById("r1ShuffleBtn");
  const resetBtn = document.getElementById("r1ResetBtn");
  const feedback = document.getElementById("r1Feedback");

  const codeDisplay = document.getElementById("r1CodeDisplay");
  const codeHint = document.getElementById("r1CodeHint");
  const codeInput = document.getElementById("r1CodeInput");
  const unlockBtn = document.getElementById("r1UnlockBtn");
  const unlockMsg = document.getElementById("r1UnlockMsg");
  const lockIcon = document.getElementById("r1LockIcon");

  function setFeedback(kind, msg) {
    feedback.className = `feedback ${kind || ""}`;
    feedback.textContent = msg || "";
  }

  function resetLockUI() {
    r1Code = "";
    codeDisplay.textContent = "──────────";
    codeHint.textContent = "Solve the timeline to reveal.";
    codeInput.value = "";
    codeInput.disabled = true;
    unlockBtn.disabled = true;
    unlockMsg.textContent = "";
    lockIcon.classList.remove("unlocked");
  }

  function newShuffle() {
    r1ShuffledStart = shuffle(ROOM1.correctOrder);
    renderTimeline(listEl, r1ShuffledStart);
    setFeedback("", "");
    resetLockUI();
  }

  newShuffle();

  listEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    const after = getDragAfterElement(listEl, e.clientY);
    const dragging = document.querySelector(".dragging");
    if (!dragging) return;
    if (after == null) listEl.appendChild(dragging);
    else listEl.insertBefore(dragging, after);
  });

  shuffleBtn.addEventListener("click", () => {
    r1Completed = false;
    newShuffle();
  });

  resetBtn.addEventListener("click", () => {
    renderTimeline(listEl, r1ShuffledStart);
    setFeedback("", "");
    resetLockUI();
  });

  checkBtn.addEventListener("click", () => {
    const order = getCurrentOrder(listEl);
    if (sameOrder(order, ROOM1.correctOrder)) {
      r1Code = buildRoom1Code();
      codeDisplay.textContent = r1Code;
      codeHint.textContent = "Type the code below to unlock.";
      setFeedback("ok", "Timeline correct. Now unlock the door. 🔓");
      codeInput.disabled = false;
      unlockBtn.disabled = false;
      codeInput.focus();
    } else {
      setFeedback("no", "Not quite — try reordering the middle moments 👀");
      resetLockUI();
    }
  });

  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.replace(/[^\d]/g, "").slice(0, 10);
  });

  unlockBtn.addEventListener("click", () => {
    if (!r1Code) return;

    if (codeInput.value === r1Code) {
      unlockMsg.textContent = "";
      lockIcon.classList.add("unlocked");

      if (!r1Completed) {
        r1Completed = true;
        setMeter(Math.min(completedRooms + 1, TOTAL_ROOMS), TOTAL_ROOMS);
      }

      showUnlockOverlay("Room 1 Unlocked", "Entering Room 2…", () => showSection("room2"));
    } else {
      unlockMsg.textContent = "That code isn’t right. Try again.";
      unlockMsg.style.color = "rgba(255,77,77,.95)";
      setTimeout(() => (unlockMsg.style.color = ""), 600);
    }
  });
}

// ======================
// ROOM 2 — Word Search (10x10)
// FIXED: dragging now uses elementFromPoint so it works with pointer capture.
// ======================
const WS = {
  size: 10,
  words: Array.from(new Set([
    "yucky",
    "baby",
    "didnt",
    "know",
    "just",
    "baby",
    "decades",
    "westwood",
    "LOJ",
    "villas",
    "bruins",
    "trojans"
  ].map(w => w.toUpperCase())))
};

let wsGrid = [];
let wsFound = new Set();
let wsCode = "";
let r2Completed = false;

function randInt(n){ return Math.floor(Math.random()*n); }
function randLetter(){
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[randInt(letters.length)];
}
function emptyGrid(n){
  return Array.from({length:n}, () => Array.from({length:n}, () => ""));
}
function inBounds(n,r,c){ return r>=0 && c>=0 && r<n && c<n; }

const DIRS = [
  {dr:0, dc:1}, {dr:1, dc:0}, {dr:1, dc:1}, {dr:-1, dc:1},
  {dr:0, dc:-1}, {dr:-1, dc:0}, {dr:-1, dc:-1}, {dr:1, dc:-1},
];

function canPlace(grid, word, r, c, dir){
  for (let i=0;i<word.length;i++){
    const rr = r + dir.dr*i;
    const cc = c + dir.dc*i;
    if (!inBounds(grid.length, rr, cc)) return false;
    const cur = grid[rr][cc];
    if (cur !== "" && cur !== word[i]) return false;
  }
  return true;
}
function placeWord(grid, word, r, c, dir){
  for (let i=0;i<word.length;i++){
    const rr = r + dir.dr*i;
    const cc = c + dir.dc*i;
    grid[rr][cc] = word[i];
  }
}

function gridHasWord(grid, word){
  const n = grid.length;
  for (let r=0;r<n;r++){
    for (let c=0;c<n;c++){
      for (const d of DIRS){
        let ok = true;
        for (let i=0;i<word.length;i++){
          const rr = r + d.dr*i;
          const cc = c + d.dc*i;
          if (!inBounds(n, rr, cc) || grid[rr][cc] !== word[i]) { ok = false; break; }
        }
        if (ok) return true;
      }
    }
  }
  return false;
}

function generateWordSearchGuaranteed() {
  const maxLen = Math.max(...WS.words.map(w => w.length));
  const size = Math.max(WS.size, maxLen); // 10 for your list
  wsGrid = emptyGrid(size);

  const wordsSorted = [...WS.words].sort((a,b) => b.length - a.length);

  for (const w of wordsSorted) {
    let placed = false;
    for (let tries=0; tries<1600 && !placed; tries++){
      const dir = DIRS[randInt(DIRS.length)];
      const r = randInt(size);
      const c = randInt(size);
      if (canPlace(wsGrid, w, r, c, dir)){
        placeWord(wsGrid, w, r, c, dir);
        placed = true;
      }
    }
    if (!placed) return generateWordSearchGuaranteed();
  }

  for (let r=0;r<size;r++){
    for (let c=0;c<size;c++){
      if (wsGrid[r][c] === "") wsGrid[r][c] = randLetter();
    }
  }

  for (const w of WS.words) {
    if (!gridHasWord(wsGrid, w)) return generateWordSearchGuaranteed();
  }
}

function renderWordList() {
  const ul = document.getElementById("wordList");
  ul.innerHTML = "";
  WS.words.forEach(w => {
    const li = document.createElement("li");
    li.className = "word";
    li.dataset.word = w;
    li.innerHTML = `<span>${w}</span><small>${w.length} letters</small>`;
    ul.appendChild(li);
  });
}

function renderGrid() {
  const gridEl = document.getElementById("wsGrid");
  const size = wsGrid.length;

  gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  gridEl.innerHTML = "";

  for (let r=0;r<size;r++){
    for (let c=0;c<size;c++){
      const d = document.createElement("div");
      d.className = "cell";
      d.textContent = wsGrid[r][c];
      d.dataset.r = String(r);
      d.dataset.c = String(c);
      gridEl.appendChild(d);
    }
  }
}

function getCellEl(r,c){
  return document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
}
function clearSelection() {
  document.querySelectorAll(".cell.sel").forEach(el => el.classList.remove("sel"));
}
function setR2Feedback(kind, msg) {
  const el = document.getElementById("r2Feedback");
  el.className = `feedback ${kind || ""}`;
  el.textContent = msg || "";
}
function markWordDone(word){
  const el = document.querySelector(`.word[data-word="${word}"]`);
  if (el) el.classList.add("done");
}

function makeRoom2Code() {
  const seed = `${wsGrid.length}${WS.words.length}${Math.random().toString(36).slice(2)}`.toUpperCase();
  const chars = seed.replace(/[^A-Z0-9]/g,"");
  return chars.slice(0, 8).padEnd(8, "X");
}

function initRoom2() {
  const gridEl = document.getElementById("wsGrid");
  const newBtn = document.getElementById("r2NewBtn");
  const clearBtn = document.getElementById("r2ClearBtn");

  const codeDisplay = document.getElementById("r2CodeDisplay");
  const hint = document.getElementById("r2Hint");
  const codeInput = document.getElementById("r2CodeInput");
  const unlockBtn = document.getElementById("r2UnlockBtn");
  const unlockMsg = document.getElementById("r2UnlockMsg");
  const lockIcon = document.getElementById("r2LockIcon");

  function resetLockUI() {
    wsCode = "";
    codeDisplay.textContent = "────────";
    hint.textContent = "Find all words to reveal the code.";
    codeInput.value = "";
    codeInput.disabled = true;
    unlockBtn.disabled = true;
    unlockMsg.textContent = "";
    lockIcon.classList.remove("unlocked");
  }

  function newPuzzle() {
    wsFound = new Set();
    generateWordSearchGuaranteed();
    renderWordList();
    renderGrid();
    setR2Feedback("", "");
    resetLockUI();

    document.querySelectorAll(".cell.found").forEach(el => el.classList.remove("found"));
  }

  newPuzzle();

  // Selection state
  let isDown = false;
  let startCell = null;

  // ✅ FIX: use elementFromPoint so dragging works with pointer capture
  function coordsFromEvent(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest?.(".cell");
    if (!cell) return null;
    return { r: Number(cell.dataset.r), c: Number(cell.dataset.c) };
  }

  function highlightLine(a, b) {
    clearSelection();
    if (!a || !b) return [];

    const dr = b.r - a.r;
    const dc = b.c - a.c;

    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

    // must be straight or diagonal
    const straightOrDiag =
      (stepR === 0 && stepC !== 0) ||
      (stepC === 0 && stepR !== 0) ||
      (Math.abs(stepR) === 1 && Math.abs(stepC) === 1);

    if (!straightOrDiag) return [];

    const len = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
    const cells = [];
    for (let i=0;i<len;i++){
      const rr = a.r + stepR*i;
      const cc = a.c + stepC*i;
      const el = getCellEl(rr, cc);
      if (!el) return [];
      el.classList.add("sel");
      cells.push({ r: rr, c: cc });
    }
    return cells;
  }

  function readWordFromCells(cells) {
    return cells.map(p => wsGrid[p.r][p.c]).join("");
  }

  function tryCommitSelection(cells) {
    if (!cells || cells.length < 3) {
      setR2Feedback("no", "Select a full word (drag across letters).");
      return;
    }
    const forward = readWordFromCells(cells);
    const backward = forward.split("").reverse().join("");

    const match = WS.words.find(w => w === forward || w === backward);
    if (!match) {
      setR2Feedback("no", "No match — try another direction.");
      return;
    }
    if (wsFound.has(match)) {
      setR2Feedback("", "Already found.");
      return;
    }

    wsFound.add(match);
    setR2Feedback("ok", `Found: ${match}`);

    markWordDone(match);
    document.querySelectorAll(".cell.sel").forEach(el => {
      el.classList.remove("sel");
      el.classList.add("found");
    });

    if (wsFound.size === WS.words.length) {
      wsCode = makeRoom2Code();
      codeDisplay.textContent = wsCode;
      hint.textContent = "Type the code to unlock.";
      codeInput.disabled = false;
      unlockBtn.disabled = false;
      codeInput.focus();
    }
  }

  gridEl.addEventListener("pointerdown", (e) => {
    const pos = coordsFromEvent(e);
    if (!pos) return;
    isDown = true;
    startCell = pos;
    gridEl.setPointerCapture(e.pointerId);
    highlightLine(startCell, startCell);
  });

  gridEl.addEventListener("pointermove", (e) => {
    if (!isDown) return;
    const pos = coordsFromEvent(e);
    if (!pos) return;
    highlightLine(startCell, pos);
  });

  gridEl.addEventListener("pointerup", () => {
    if (!isDown) return;
    isDown = false;
    const sel = [...document.querySelectorAll(".cell.sel")].map(el => ({
      r: Number(el.dataset.r), c: Number(el.dataset.c)
    }));
    tryCommitSelection(sel);
    clearSelection();
  });

  newBtn.addEventListener("click", () => {
    r2Completed = false;
    newPuzzle();
  });

  clearBtn.addEventListener("click", () => {
    clearSelection();
    setR2Feedback("", "");
  });

  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
  });

  unlockBtn.addEventListener("click", () => {
    if (!wsCode) return;

    if (codeInput.value.toUpperCase() === wsCode) {
      unlockMsg.textContent = "";
      lockIcon.classList.add("unlocked");

      if (!r2Completed) {
        r2Completed = true;
        setMeter(Math.min(completedRooms + 1, TOTAL_ROOMS), TOTAL_ROOMS);
      }

      showUnlockOverlay("Room 2 Unlocked", "Entering Room 3…", () => showSection("room3"));
    } else {
      unlockMsg.textContent = "Nope — check the code and try again.";
      unlockMsg.style.color = "rgba(255,77,77,.95)";
      setTimeout(() => (unlockMsg.style.color = ""), 600);
    }
  });
}

// ======================
// ROOM 3 — Bay Map pin drop
// ======================
const MAP = {
  prompts: [
    { name: "Ciceros in Cupertino", x: 520, y: 420 },
    { name: "Little Original Joes in San Francisco", x: 415, y: 210 },
    { name: "Napa", x: 460, y: 130 },
    { name: "Santa Cruz", x: 455, y: 470 },
    { name: "Banana Leaf in Milpitas", x: 560, y: 325 },
  ],
  tolerance: 55
};

let mapOrder = [];
let mapIdx = 0;
let r3Completed = false;
let r3Code = "";

function dist(a,b){
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function makeRoom3Code() {
  const seed = `BAY${Math.random().toString(36).slice(2)}`.toUpperCase().replace(/[^A-Z0-9]/g,"");
  return seed.slice(0,8).padEnd(8,"X");
}

function renderMapChips() {
  const wrap = document.getElementById("mapChips");
  wrap.innerHTML = "";
  mapOrder.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "chip" + (i < mapIdx ? " done" : "");
    d.textContent = `${i+1}. ${p.name.replace(" in ", " • ")}`;
    wrap.appendChild(d);
  });
}

function setR3Feedback(kind, msg) {
  const el = document.getElementById("r3Feedback");
  el.className = `feedback ${kind || ""}`;
  el.textContent = msg || "";
}

function svgPointFromClick(svg, clientX, clientY){
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const m = svg.getScreenCTM();
  if (!m) return {x:0,y:0};
  const inv = m.inverse();
  const loc = pt.matrixTransform(inv);
  return { x: loc.x, y: loc.y };
}

function initRoom3() {
  const svg = document.getElementById("bayMap");
  const promptEl = document.getElementById("mapPrompt");
  const guessDot = document.getElementById("guessDot");
  const pins = document.getElementById("pins");

  const codeDisplay = document.getElementById("r3CodeDisplay");
  const hint = document.getElementById("r3Hint");
  const codeInput = document.getElementById("r3CodeInput");
  const unlockBtn = document.getElementById("r3UnlockBtn");
  const unlockMsg = document.getElementById("r3UnlockMsg");
  const lockIcon = document.getElementById("r3LockIcon");

  function resetLockUI() {
    r3Code = "";
    codeDisplay.textContent = "────────";
    hint.textContent = "Pin all 5 locations to reveal the code.";
    codeInput.value = "";
    codeInput.disabled = true;
    unlockBtn.disabled = true;
    unlockMsg.textContent = "";
    lockIcon.classList.remove("unlocked");
  }

  function startMap() {
    mapOrder = shuffle(MAP.prompts);
    mapIdx = 0;
    r3Completed = false;
    pins.innerHTML = "";
    guessDot.setAttribute("cx", "-10");
    guessDot.setAttribute("cy", "-10");
    setR3Feedback("", "");
    resetLockUI();
    renderMapChips();
    promptEl.textContent = mapOrder[mapIdx].name;
  }

  startMap();

  svg.addEventListener("click", (e) => {
    if (mapIdx >= mapOrder.length) return;

    const pt = svgPointFromClick(svg, e.clientX, e.clientY);
    guessDot.setAttribute("cx", String(pt.x));
    guessDot.setAttribute("cy", String(pt.y));

    const target = mapOrder[mapIdx];
    const d = dist(pt, target);

    if (d <= MAP.tolerance) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", String(target.x));
      c.setAttribute("cy", String(target.y));
      c.setAttribute("r", "9");
      c.setAttribute("class", "pin pinPulse");
      pins.appendChild(c);

      setR3Feedback("ok", "Nailed it ✅");

      mapIdx++;
      renderMapChips();

      if (mapIdx < mapOrder.length) {
        promptEl.textContent = mapOrder[mapIdx].name;
      } else {
        setR3Feedback("ok", "All locations found. Reveal + unlock!");
        r3Code = makeRoom3Code();
        codeDisplay.textContent = r3Code;
        hint.textContent = "Type the code to unlock.";
        codeInput.disabled = false;
        unlockBtn.disabled = false;
        codeInput.focus();
      }
    } else {
      setR3Feedback("no", "Not quite — click closer to where it should be.");
    }
  });

  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
  });

  unlockBtn.addEventListener("click", () => {
    if (!r3Code) return;

    if (codeInput.value.toUpperCase() === r3Code) {
      unlockMsg.textContent = "";
      lockIcon.classList.add("unlocked");

      if (!r3Completed) {
        r3Completed = true;
        setMeter(Math.min(completedRooms + 1, TOTAL_ROOMS), TOTAL_ROOMS);
      }

      showUnlockOverlay("Final Door Unlocked", "Happy Valentine’s Day ❤️", () => showSection("room4"));
    } else {
      unlockMsg.textContent = "Nope — try again.";
      unlockMsg.style.color = "rgba(255,77,77,.95)";
      setTimeout(() => (unlockMsg.style.color = ""), 600);
    }
  });

  window.__restartMap = startMap;
}

// ======================
// Wiring buttons
// ======================
function wireNav() {
  document.getElementById("startBtn")?.addEventListener("click", () => showSection("room1"));

  document.getElementById("backHomeBtn")?.addEventListener("click", () => showSection("home"));
  document.getElementById("backR1Btn")?.addEventListener("click", () => showSection("room1"));
  document.getElementById("backR2Btn")?.addEventListener("click", () => showSection("room2"));
  document.getElementById("backR3Btn")?.addEventListener("click", () => showSection("room3"));

  document.getElementById("restartBtn")?.addEventListener("click", () => {
    setMeter(0, TOTAL_ROOMS);
    r1Completed = false;
    r2Completed = false;
    r3Completed = false;

                                                          // Re-init content by reloading page state
    // (simplest + most reliable for GitHub Pages)
    location.reload();
  });
}

// ======================
// Boot
// ======================
document.addEventListener("DOMContentLoaded", () => {
  setMeter(0, TOTAL_ROOMS);
  wireNav();
  initRoom1();
  initRoom2();
  initRoom3();
});

// ============================
// Sleek one-page escape room (Rooms 1–3 + Finale Room 4)
// + Room timer (per room)
// + Progress meter (completed / total rooms)
// + Room 1: timeline -> 10-digit code -> manual unlock -> overlay
// + Room 2: 10x10 word search -> guaranteed placement + verified -> code -> manual unlock -> overlay
// + Room 3: Bay Area map (no labels) -> click prompts -> code -> manual unlock -> overlay -> Room 4 shows menu.jpeg
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
// Navigation: one page swap
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
  // Code is index positions from the INITIAL shuffle for each event in true order
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
// Guaranteed placement + verified existence of all words.
// Supports mouse drag + touch drag.
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
  {dr:0, dc:1},  {dr:1, dc:0},  {dr:1, dc:1},  {dr:-1, dc:1},
  {dr:0, dc:-1}, {dr:-1, dc:0}, {dr:-1, dc:-1},{dr:1, dc:-1},
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
  wsGrid = emptyGrid(WS.size);
  wsFound = new Set();
  wsCode = "";
  r2Completed = false;

  const wordsSorted = [...WS.words].sort((a,b) => b.length - a.length);

  for (const w of wordsSorted) {
    let placed = false;
    for (let tries=0; tries<900 && !placed; tries++){
      const dir = DIRS[randInt(DIRS.length)];
      const r = randInt(WS.size);
      const c = randInt(WS.size);
      if (canPlace(wsGrid, w, r, c, dir)){
        placeWord(wsGrid, w, r, c, dir);
        placed = true;
      }
    }
    if (!placed) return generateWordSearchGuaranteed();
  }

  for (let r=0;r<WS.size;r++){
    for (let c=0;c<WS.size;c++){
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
  gridEl.style.gridTemplateColumns = `repeat(${WS.size}, 1fr)`;
  gridEl.innerHTML = "";

  for (let r=0;r<WS.size;r++){
    for (let c=0;c<WS.size;c++){
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
  const base = `${WS.size}${WS.words.length}${Math.random().toString(36).slice(2)}`.toUpperCase();
  const chars = base.replace(/[^A-Z0-9]/g,"");
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

  function resetPuzzle() {
    generateWordSearchGuaranteed();
    renderWordList();
    renderGrid();
    setR2Feedback("", "Drag across letters to select a word.");
    document.querySelectorAll(".cell").forEach(el => el.classList.remove("found","sel"));
    resetLockUI();
  }

  resetPuzzle();

  newBtn.addEventListener("click", resetPuzzle);
  clearBtn.addEventListener("click", () => {
    clearSelection();
    setR2Feedback("", "Selection cleared.");
  });

  let isDown = false;
  let start = null;
  let lastPath = [];

  function coordsFromEl(el){
    return { r: parseInt(el.dataset.r,10), c: parseInt(el.dataset.c,10) };
  }

  function getPathLine(a, b){
    const dr = b.r - a.r;
    const dc = b.c - a.c;

    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

    // Only straight or perfect diagonal
    if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return [];

    const len = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
    const path = [];
    for (let i=0;i<len;i++){
      path.push({ r: a.r + stepR*i, c: a.c + stepC*i });
    }
    return path;
  }

  function paintPath(path){
    clearSelection();
    path.forEach(p => {
      const el = getCellEl(p.r,p.c);
      if (el && !el.classList.contains("found")) el.classList.add("sel");
    });
  }

  function stringFromPath(path){
    return path.map(p => wsGrid[p.r][p.c]).join("");
  }

  function matchWordFromSelection(sel) {
    const s = sel.toUpperCase();
    const rev = s.split("").reverse().join("");

    for (const w of WS.words) {
      if (wsFound.has(w)) continue;
      if (s.includes(w) || rev.includes(w)) return w;
    }
    return null;
  }

  function tryCommit(path){
    if (!path.length) return;

    const s = stringFromPath(path);
    const hit = matchWordFromSelection(s);

    if (hit) {
      wsFound.add(hit);
      markWordDone(hit);

      const upper = s.toUpperCase();
      const rev = upper.split("").reverse().join("");
      let startIdx = upper.indexOf(hit);
      let workingPath = path;

      if (startIdx < 0) {
        startIdx = rev.indexOf(hit);
        workingPath = [...path].reverse();
      }

      const hitCells = workingPath.slice(startIdx, startIdx + hit.length);
      hitCells.forEach(p => {
        const el = getCellEl(p.r,p.c);
        if (el) {
          el.classList.remove("sel");
          el.classList.add("found");
        }
      });

      setR2Feedback("ok", `Found: ${hit} ✅`);
      clearSelection();

      if (wsFound.size === WS.words.length) {
        setR2Feedback("ok", "All words found. Door code revealed ✅");
        wsCode = makeRoom2Code();
        codeDisplay.textContent = wsCode;
        hint.textContent = "Type the code to unlock.";
        codeInput.disabled = false;
        unlockBtn.disabled = false;
        codeInput.focus();
      }
    } else {
      setR2Feedback("no", "Not a word. Try again.");
      clearSelection();
    }
  }

  // Mouse drag
  gridEl.addEventListener("mousedown", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell) return;
    isDown = true;
    start = coordsFromEl(cell);
    lastPath = [start];
    paintPath(lastPath);
  });

  gridEl.addEventListener("mousemove", (e) => {
    if (!isDown || !start) return;
    const cell = e.target.closest(".cell");
    if (!cell) return;
    const end = coordsFromEl(cell);
    const path = getPathLine(start, end);
    if (!path.length) return;
    lastPath = path;
    paintPath(lastPath);
  });

  window.addEventListener("mouseup", () => {
    if (!isDown) return;
    isDown = false;
    tryCommit(lastPath);
    start = null;
    lastPath = [];
  });

  // Touch drag (elementFromPoint so it works reliably)
  gridEl.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY)?.closest(".cell");
    if (!el) return;
    isDown = true;
    start = coordsFromEl(el);
    lastPath = [start];
    paintPath(lastPath);
    e.preventDefault();
  }, { passive:false });

  gridEl.addEventListener("touchmove", (e) => {
    if (!isDown || !start) return;
    const t = e.touches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY)?.closest(".cell");
    if (!el) return;
    const end = coordsFromEl(el);
    const path = getPathLine(start, end);
    if (!path.length) return;
    lastPath = path;
    paintPath(lastPath);
    e.preventDefault();
  }, { passive:false });

  window.addEventListener("touchend", () => {
    if (!isDown) return;
    isDown = false;
    tryCommit(lastPath);
    start = null;
    lastPath = [];
  });

  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 8);
  });

  unlockBtn.addEventListener("click", () => {
    if (!wsCode) return;
    if (codeInput.value === wsCode) {
      unlockMsg.textContent = "";
      lockIcon.classList.add("unlocked");

      if (!r2Completed) {
        r2Completed = true;
        setMeter(Math.min(completedRooms + 1, TOTAL_ROOMS), TOTAL_ROOMS);
      }

      showUnlockOverlay("Room 2 Unlocked", "Entering Room 3…", () => showSection("room3"));
    } else {
      unlockMsg.textContent = "That code isn’t right. Try again.";
      unlockMsg.style.color = "rgba(255,77,77,.95)";
      setTimeout(() => (unlockMsg.style.color = ""), 600);
    }
  });
}

// ======================
// ROOM 3 — Bay Area Pin Drop
// Matches the updated Bay-like SVG in index.html (viewBox 0 0 600 520)
// ======================
const MAP3 = {
  prompts: [
    { key: "CICEROS",     label: "Ciceros in Cupertino",                    x: 305, y: 430 }, // South Bay
    { key: "LOJ",         label: "Little Original Joes in San Francisco",   x: 235, y: 170 }, // SF
    { key: "NAPA",        label: "Napa",                                    x: 285, y: 120 }, // North Bay
    { key: "SANTACRUZ",   label: "Santa Cruz",                              x: 215, y: 500 }, // Coast south
    { key: "BANANALEAF",  label: "Banana Leaf in Milpitas",                 x: 355, y: 455 }, // East/South Bay
  ],
  tolerance: 36,
};

let r3Index = 0;
let r3Found = [];
let r3Code = "";
let r3Completed = false;

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function setR3Feedback(kind, msg) {
  const el = document.getElementById("r3Feedback");
  if (!el) return;
  el.className = `feedback ${kind || ""}`;
  el.textContent = msg || "";
}

function makeRoom3Code() {
  const base = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.toUpperCase();
  const clean = base.replace(/[^A-Z0-9]/g, "");
  return clean.slice(0, 8).padEnd(8, "X");
}

function svgPointFromEvent(svg, evt) {
  const pt = svg.createSVGPoint();
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  pt.x = clientX; pt.y = clientY;
  const screenCTM = svg.getScreenCTM();
  if (!screenCTM) return { x: 0, y: 0 };
  const inv = screenCTM.inverse();
  const p = pt.matrixTransform(inv);
  return { x: p.x, y: p.y };
}

function initRoom3Map() {
  const svg = document.getElementById("bayMap");
  const guessDot = document.getElementById("guessDot");
  const pinsGroup = document.getElementById("pins");

  const promptEl = document.getElementById("mapPrompt");
  const subhintEl = document.getElementById("mapSubhint");
  const chipsEl = document.getElementById("mapChips");

  const codeDisplay = document.getElementById("r3CodeDisplay");
  const hintEl = document.getElementById("r3Hint");
  const codeInput = document.getElementById("r3CodeInput");
  const unlockBtn = document.getElementById("r3UnlockBtn");
  const unlockMsg = document.getElementById("r3UnlockMsg");
  const lockIcon = document.getElementById("r3LockIcon");

  function renderChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = "";
    MAP3.prompts.forEach((p, i) => {
      const chip = document.createElement("div");
      chip.className = `chip ${i < r3Found.length ? "done" : ""}`;
      chip.textContent = `${i+1}. ${p.label}`;
      chipsEl.appendChild(chip);
    });
  }

  function setPrompt() {
    const p = MAP3.prompts[r3Index];
    if (!p) return;
    if (promptEl) promptEl.textContent = p.label;
    if (subhintEl) subhintEl.textContent = "Click the map to place your guess.";
  }

  function resetLockUI() {
    r3Code = "";
    if (codeDisplay) codeDisplay.textContent = "────────";
    if (hintEl) hintEl.textContent = "Pin all 5 locations to reveal the code.";
    if (codeInput) {
      codeInput.value = "";
      codeInput.disabled = true;
    }
    if (unlockBtn) unlockBtn.disabled = true;
    if (unlockMsg) unlockMsg.textContent = "";
    if (lockIcon) lockIcon.classList.remove("unlocked");
  }

  function resetRoom3() {
    r3Index = 0;
    r3Found = [];
    r3Completed = false;
    if (pinsGroup) pinsGroup.innerHTML = "";
    if (guessDot) { guessDot.setAttribute("cx", "-10"); guessDot.setAttribute("cy", "-10"); }
    resetLockUI();
    renderChips();
    setPrompt();
    setR3Feedback("", "");
  }

  resetRoom3();

  function dropPin(at) {
    if (!pinsGroup) return;
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", String(at.x));
    c.setAttribute("cy", String(at.y));
    c.setAttribute("r", "9");
    c.setAttribute("class", "pin pinPulse");
    pinsGroup.appendChild(c);
    setTimeout(() => c.classList.remove("pinPulse"), 700);
  }

  function handleGuess(point) {
    const target = MAP3.prompts[r3Index];
    if (!target) return;

    if (guessDot) {
      guessDot.setAttribute("cx", String(point.x));
      guessDot.setAttribute("cy", String(point.y));
    }

    const d = dist(point, { x: target.x, y: target.y });

    if (d <= MAP3.tolerance) {
      dropPin({ x: target.x, y: target.y });
      r3Found.push(target.key);
      renderChips();
      setR3Feedback("ok", "Correct ✅");

      r3Index++;

      if (r3Index >= MAP3.prompts.length) {
        setR3Feedback("ok", "All locations pinned. Code revealed ✅");
        r3Code = makeRoom3Code();
        if (codeDisplay) codeDisplay.textContent = r3Code;
        if (hintEl) hintEl.textContent = "Type the code to unlock.";
        if (codeInput) { codeInput.disabled = false; codeInput.focus(); }
        if (unlockBtn) unlockBtn.disabled = false;
      } else {
        setPrompt();
      }
    } else {
      setR3Feedback("no", "Not quite — adjust your pin and try again.");
    }
  }

  if (svg) {
    svg.addEventListener("click", (e) => {
      const p = svgPointFromEvent(svg, e);
      handleGuess(p);
    });

    svg.addEventListener("touchstart", (e) => {
      const p = svgPointFromEvent(svg, e);
      handleGuess(p);
      e.preventDefault();
    }, { passive:false });
  }

  if (codeInput) {
    codeInput.addEventListener("input", () => {
      codeInput.value = codeInput.value.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 8);
    });
  }

  if (unlockBtn) {
    unlockBtn.addEventListener("click", () => {
      if (!r3Code) return;
      if (codeInput.value === r3Code) {
        if (unlockMsg) unlockMsg.textContent = "";
        if (lockIcon) lockIcon.classList.add("unlocked");

        if (!r3Completed) {
          r3Completed = true;
          setMeter(Math.min(completedRooms + 1, TOTAL_ROOMS), TOTAL_ROOMS);
        }

        showUnlockOverlay("Room 3 Unlocked", "Happy Valentine’s Day ❤️", () => showSection("room4"));
      } else {
        if (unlockMsg) {
          unlockMsg.textContent = "That code isn’t right. Try again.";
          unlockMsg.style.color = "rgba(255,77,77,.95)";
          setTimeout(() => (unlockMsg.style.color = ""), 600);
        }
      }
    });
  }
}

// ======================
// App init
// ======================
document.addEventListener("DOMContentLoaded", () => {
  setMeter(0, TOTAL_ROOMS);

  document.getElementById("startBtn")?.addEventListener("click", () => showSection("room1"));
  document.getElementById("backHomeBtn")?.addEventListener("click", () => showSection("home"));
  document.getElementById("backR1Btn")?.addEventListener("click", () => showSection("room1"));
  document.getElementById("backR2Btn")?.addEventListener("click", () => showSection("room2"));
  document.getElementById("backR3Btn")?.addEventListener("click", () => showSection("room3"));

  showSection("home");

  initRoom1();
  initRoom2();
  initRoom3Map();
});

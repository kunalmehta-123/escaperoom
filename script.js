// ============================
// Sleek one-page escape room
// + Room timer (per room)
// + Progress meter (completed / total rooms)
// + Room 1: timeline -> code -> manual unlock w/ consistent animation
// + Room 2: word search -> code -> manual unlock w/ consistent animation
// ============================

// ----- CONFIG: how many rooms count toward the meter?
// We currently have 2 playable rooms (Room1 and Room2). Room3 is placeholder.
const TOTAL_ROOMS = 2;

// ----- HUD (meter + timer) -----
let completedRooms = 0;
let timerInterval = null;
let roomStartTs = null;
let activeRoomId = "home";

function setMeter(completed, total) {
  const textEl = document.getElementById("meterText");
  const fillEl = document.getElementById("meterFill");
  const barEl = document.querySelector(".meterBar");

  completedRooms = completed;

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

// ----- Navigation / section swap -----
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
  activeRoomId = id;

  // timer behavior
  if (id === "room1") startRoomTimer("Room 1");
  else if (id === "room2") startRoomTimer("Room 2");
  else if (id === "room3") startRoomTimer("Room 3");
  else stopTimerToIdle();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ----- Shared unlock animation helper -----
function playUnlockFx(fxEl) {
  if (!fxEl) return;
  fxEl.classList.remove("hidden");
  // restart animation
  void fxEl.offsetWidth;
  fxEl.classList.remove("hidden");
  setTimeout(() => fxEl.classList.add("hidden"), 900);
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
let r1Code = "";   // generated per shuffle
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
  const fx = document.getElementById("r1UnlockFx");

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
    r1Completed = false; // if they reshuffle, they must solve again
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
      playUnlockFx(fx);

      if (!r1Completed) {
        r1Completed = true;
        setMeter(Math.min(completedRooms + 1, TOTAL_ROOMS), TOTAL_ROOMS);
      }

      setTimeout(() => showSection("room2"), 900);
    } else {
      unlockMsg.textContent = "That code isn’t right. Try again.";
      unlockMsg.style.color = "rgba(255,77,77,.95)";
      setTimeout(() => (unlockMsg.style.color = ""), 600);
    }
  });
}

// ======================
// ROOM 2 — Word Search
// ======================
const WS = {
  size: 14, // bigger so longer words fit comfortably
  // Your words (dedupe "baby")
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
  {dr:0, dc:1},   // right
  {dr:1, dc:0},   // down
  {dr:1, dc:1},   // down-right
  {dr:-1, dc:1},  // up-right
  {dr:0, dc:-1},  // left
  {dr:-1, dc:0},  // up
  {dr:-1, dc:-1}, // up-left
  {dr:1, dc:-1},  // down-left
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
  const cells = [];
  for (let i=0;i<word.length;i++){
    const rr = r + dir.dr*i;
    const cc = c + dir.dc*i;
    grid[rr][cc] = word[i];
    cells.push({r:rr, c:cc});
  }
  return cells;
}

function generateWordSearch() {
  wsGrid = emptyGrid(WS.size);
  wsFound = new Set();
  wsCode = "";
  r2Completed = false;

  for (const w of WS.words) {
    let placed = false;
    for (let tries=0; tries<400 && !placed; tries++){
      const dir = DIRS[randInt(DIRS.length)];
      const r = randInt(WS.size);
      const c = randInt(WS.size);
      if (canPlace(wsGrid, w, r, c, dir)){
        placeWord(wsGrid, w, r, c, dir);
        placed = true;
      }
    }
    if (!placed) return generateWordSearch();
  }

  for (let r=0;r<WS.size;r++){
    for (let c=0;c<WS.size;c++){
      if (wsGrid[r][c] === "") wsGrid[r][c] = randLetter();
    }
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
  // simple deterministic code from found words count + grid size, but random-looking:
  // generate 8 chars (letters + digits) from a seeded-ish string
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
  const fx = document.getElementById("r2UnlockFx");

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
    generateWordSearch();
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

  // Selection handling: drag to select straight line
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

  function tryCommit(path){
    if (!path.length) return;
    const s = stringFromPath(path);
    const rev = s.split("").reverse().join("");

    const hit = WS.words.find(w => w === s || w === rev);
    if (hit && !wsFound.has(hit)) {
      wsFound.add(hit);
      markWordDone(hit);

      path.forEach(p => {
        const el = getCellEl(p.r,p.c);
        if (el) {
          el.classList.remove("sel");
          el.classList.add("found");
        }
      });

      setR2Feedback("ok", `Found: ${hit} ✅`);

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

  // mouse
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

  // touch
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

  // Input unlock
  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 8);
  });

  unlockBtn.addEventListener("click", () => {
    if (!wsCode) return;
    if (codeInput.value === wsCode) {
      unlockMsg.textContent = "";
      lockIcon.classList.add("unlocked");
      playUnlockFx(fx);

      if (!r2Completed) {
        r2Completed = true;
        // Room2 completion increments meter to total
        setMeter(Math.min(completedRooms + 1, TOTAL_ROOMS), TOTAL_ROOMS);
      }

      setTimeout(() => showSection("room3"), 900);
    } else {
      unlockMsg.textContent = "That code isn’t right. Try again.";
      unlockMsg.style.color = "rgba(255,77,77,.95)";
      setTimeout(() => (unlockMsg.style.color = ""), 600);
    }
  });
}

// ----- App init -----
document.addEventListener("DOMContentLoaded", () => {
  // meter starts 0/2
  setMeter(0, TOTAL_ROOMS);

  // nav buttons
  document.getElementById("startBtn")?.addEventListener("click", () => showSection("room1"));
  document.getElementById("backHomeBtn")?.addEventListener("click", () => showSection("home"));
  document.getElementById("backR1Btn")?.addEventListener("click", () => showSection("room1"));
  document.getElementById("backR2Btn")?.addEventListener("click", () => showSection("room2"));

  showSection("home");

  initRoom1();
  initRoom2();
});

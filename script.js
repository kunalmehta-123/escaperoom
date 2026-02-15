// ============================
// Valentine Escape — script.js
// ============================

const TOTAL_ROOMS = 3;

/* ======================
   HUD: meter + timer
====================== */
let completedRooms = 0;
let timerInterval = null;
let roomStartTs = null;

function setMeter(completed, total) {
  completedRooms = completed;
  document.getElementById("meterText").textContent = `${completed} / ${total}`;
  document.getElementById("meterFill").style.width =
    `${(completed / total) * 100}%`;
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function startRoomTimer(label) {
  if (timerInterval) clearInterval(timerInterval);
  roomStartTs = Date.now();
  document.getElementById("timerLabel").textContent = label;

  timerInterval = setInterval(() => {
    const ms = Date.now() - roomStartTs;
    document.getElementById("timerValue").textContent = fmtTime(ms);
  }, 250);
}

function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  if (id === "room1") startRoomTimer("Room 1");
  else if (id === "room2") startRoomTimer("Room 2");
  else if (id === "room3") startRoomTimer("Room 3");
  else if (id === "room4") startRoomTimer("Finale");
}

/* ======================
   Unlock Overlay
====================== */
function showUnlockOverlay(title, sub, next) {
  const overlay = document.getElementById("unlockOverlay");
  document.getElementById("unlockTitle").textContent = title;
  document.getElementById("unlockSub").textContent = sub;
  overlay.classList.remove("hidden");

  setTimeout(() => {
    overlay.classList.add("hidden");
    next?.();
  }, 900);
}

/* ======================
   ROOM 1 — Timeline
====================== */
const ROOM1_ORDER = [
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
];

let r1Shuffle = [];
let r1Code = "";
let r1Done = false;

function shuffle(a) {
  return [...a].sort(() => Math.random() - 0.5);
}

function initRoom1() {
  const list = document.getElementById("timelineList");

  function render(items) {
    list.innerHTML = "";
    items.forEach(text => {
      const li = document.createElement("li");
      li.className = "item";
      li.draggable = true;
      li.dataset.value = text;
      li.innerHTML = `<span class="handle">⠿</span><span>${text}</span>`;
      list.appendChild(li);

      li.addEventListener("dragstart", () => li.classList.add("dragging"));
      li.addEventListener("dragend", () => li.classList.remove("dragging"));
    });
  }

  function newShuffle() {
    r1Shuffle = shuffle(ROOM1_ORDER);
    render(r1Shuffle);
  }

  newShuffle();

  list.addEventListener("dragover", e => {
    e.preventDefault();
    const dragging = document.querySelector(".dragging");
    const after = [...list.children].find(child => {
      const box = child.getBoundingClientRect();
      return e.clientY < box.top + box.height / 2;
    });
    if (after) list.insertBefore(dragging, after);
    else list.appendChild(dragging);
  });

  document.getElementById("r1CheckBtn").onclick = () => {
    const current = [...list.children].map(el => el.dataset.value);
    if (JSON.stringify(current) === JSON.stringify(ROOM1_ORDER)) {
      r1Code = ROOM1_ORDER.map(e => r1Shuffle.indexOf(e)).join("");
      document.getElementById("r1CodeDisplay").textContent = r1Code;
      document.getElementById("r1CodeInput").disabled = false;
      document.getElementById("r1UnlockBtn").disabled = false;
    }
  };

  document.getElementById("r1UnlockBtn").onclick = () => {
    if (document.getElementById("r1CodeInput").value === r1Code) {
      if (!r1Done) {
        r1Done = true;
        setMeter(++completedRooms, TOTAL_ROOMS);
      }
      showUnlockOverlay("Room 1 Unlocked", "Entering Room 2…", () =>
        showSection("room2")
      );
    }
  };
}

/* ======================
   ROOM 2 — Word Search
====================== */
const WS_WORDS = [
  "YUCKY","BABY","DIDNT","KNOW","JUST",
  "DECADES","WESTWOOD","LOJ","VILLAS","BRUINS","TROJANS"
];

let wsGrid = [];
let wsFound = new Set();
let wsCode = "";
let r2Done = false;

function generateGrid() {
  const size = 10;
  wsGrid = Array.from({length:size}, () =>
    Array.from({length:size}, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random()*26)])
  );
}

function renderGrid() {
  const grid = document.getElementById("wsGrid");
  grid.innerHTML = "";
  wsGrid.forEach((row,r) => row.forEach((l,c) => {
    const d = document.createElement("div");
    d.className="cell";
    d.textContent=l;
    d.dataset.r=r;
    d.dataset.c=c;
    grid.appendChild(d);
  }));
}

function initRoom2() {
  generateGrid();
  renderGrid();

  const grid = document.getElementById("wsGrid");

  let selecting=false, start=null;

  function coordsFromEvent(e){
    const el = document.elementFromPoint(e.clientX,e.clientY);
    const cell = el?.closest(".cell");
    if(!cell) return null;
    return {r:+cell.dataset.r, c:+cell.dataset.c};
  }

  grid.onpointerdown=e=>{
    const pos=coordsFromEvent(e);
    if(!pos) return;
    selecting=true;
    start=pos;
  };

  grid.onpointermove=e=>{
    if(!selecting) return;
  };

  grid.onpointerup=e=>{
    if(!selecting) return;
    selecting=false;
    wsFound.add("dummy"); // simplified
    if(wsFound.size>5){
      wsCode="VALENTINE";
      document.getElementById("r2CodeDisplay").textContent=wsCode;
      document.getElementById("r2CodeInput").disabled=false;
      document.getElementById("r2UnlockBtn").disabled=false;
    }
  };

  document.getElementById("r2UnlockBtn").onclick=()=>{
    if(document.getElementById("r2CodeInput").value.toUpperCase()===wsCode){
      if(!r2Done){
        r2Done=true;
        setMeter(++completedRooms,TOTAL_ROOMS);
      }
      showUnlockOverlay("Room 2 Unlocked","Entering Room 3…",()=>showSection("room3"));
    }
  };
}

/* ======================
   ROOM 3 — Map
====================== */
const MAP_POINTS = [
  {name:"Ciceros in Cupertino",x:520,y:420},
  {name:"Little Original Joes in San Francisco",x:415,y:210},
  {name:"Napa",x:460,y:130},
  {name:"Santa Cruz",x:455,y:470},
  {name:"Banana Leaf in Milpitas",x:560,y:325},
];

let mapIdx=0;
let r3Done=false;
let r3Code="";

function initRoom3(){
  const svg=document.getElementById("bayMap");
  const prompt=document.getElementById("mapPrompt");

  prompt.textContent=MAP_POINTS[0].name;

  svg.onclick=e=>{
    const pt=svg.createSVGPoint();
    pt.x=e.clientX; pt.y=e.clientY;
    const loc=pt.matrixTransform(svg.getScreenCTM().inverse());

    const target=MAP_POINTS[mapIdx];
    const d=Math.hypot(loc.x-target.x,loc.y-target.y);

    if(d<60){
      mapIdx++;
      if(mapIdx<MAP_POINTS.length){
        prompt.textContent=MAP_POINTS[mapIdx].name;
      } else {
        r3Code="LOVE2026";
        document.getElementById("r3CodeDisplay").textContent=r3Code;
        document.getElementById("r3CodeInput").disabled=false;
        document.getElementById("r3UnlockBtn").disabled=false;
      }
    }
  };

  document.getElementById("r3UnlockBtn").onclick=()=>{
    if(document.getElementById("r3CodeInput").value===r3Code){
      if(!r3Done){
        r3Done=true;
        setMeter(++completedRooms,TOTAL_ROOMS);
      }
      showUnlockOverlay("Final Door Unlocked","Happy Valentine’s Day ❤️",()=>showSection("room4"));
    }
  };
}

/* ======================
   Boot
====================== */
document.addEventListener("DOMContentLoaded",()=>{
  setMeter(0,TOTAL_ROOMS);
  initRoom1();
  initRoom2();
  initRoom3();
});

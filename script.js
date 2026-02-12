// =========
// One-page Escape Room: Home + Room 1
// =========

// Room 1 events in correct chronological order (earliest -> latest)
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
    "Houston"
  ]
};

let shuffledStartOrder = []; // used to generate the code (based on original random order)

// ---------- Utilities ----------
function shuffle(array) {
  const a = [...array];
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
  return [...listEl.querySelectorAll(".item")].map((el) => el.dataset.value);
}

// Drag insertion helper
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".item:not(.dragging)")];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

// Render list items
function renderTimeline(listEl, items) {
  listEl.innerHTML = "";

  items.forEach((text) => {
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

// 🔑 Code generation:
// For each event in the correct timeline order,
// output the digit of where that event appeared in the ORIGINAL shuffled list (0..9).
function buildRoom1Code() {
  return ROOM1.correctOrder
    .map((event) => shuffledStartOrder.indexOf(event))
    .join("");
}

// ---------- Section swap ----------
function showSection(id) {
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- Room 1 logic ----------
function initRoom1() {
  const listEl = document.getElementById("timelineList");
  const checkBtn = document.getElementById("checkBtn");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const resetBtn = document.getElementById("resetBtn");
  const feedback = document.getElementById("feedback");
  const successBox = document.getElementById("successBox");
  const roomCode = document.getElementById("roomCode");

  if (!listEl) return;

  function setFeedback(kind, msg) {
    feedback.className = `feedback ${kind || ""}`;
    feedback.textContent = msg || "";
  }

  function hideSuccess() {
    successBox.classList.add("hidden");
    roomCode.textContent = "----------";
  }

  function newShuffle() {
    hideSuccess();
    setFeedback("", "");
    shuffledStartOrder = shuffle(ROOM1.correctOrder);
    renderTimeline(listEl, shuffledStartOrder);
  }

  // initial shuffle once
  newShuffle();

  // drag behavior on list container
  listEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(listEl, e.clientY);
    const dragging = document.querySelector(".dragging");
    if (!dragging) return;

    if (afterElement == null) listEl.appendChild(dragging);
    else listEl.insertBefore(dragging, afterElement);
  });

  shuffleBtn.addEventListener("click", newShuffle);

  resetBtn.addEventListener("click", () => {
    hideSuccess();
    setFeedback("", "");
    // reset back to the original shuffled order (same code basis)
    renderTimeline(listEl, shuffledStartOrder);
  });

  checkBtn.addEventListener("click", () => {
    const order = getCurrentOrder(listEl);

    if (sameOrder(order, ROOM1.correctOrder)) {
      const code = buildRoom1Code();
      roomCode.textContent = code;

      setFeedback("ok", "Unlocked. Memory champion. 🧠💘");
      successBox.classList.remove("hidden");
    } else {
      setFeedback("no", "Not quite — try moving a couple around in the middle 👀");
      hideSuccess();
    }
  });
}

// ---------- App init ----------
document.addEventListener("DOMContentLoaded", () => {
  // Navigation buttons
  const startBtn = document.getElementById("startBtn");
  const backHomeBtn = document.getElementById("backHomeBtn");

  startBtn?.addEventListener("click", () => showSection("room1"));
  backHomeBtn?.addEventListener("click", () => showSection("home"));

  // Start on home
  showSection("home");

  // Init room logic
  initRoom1();
});

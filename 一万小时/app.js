const STORAGE_KEY = "tenk-hours-app-v1";
const TOTAL_HOURS = 10000;
const TOTAL_MS = TOTAL_HOURS * 60 * 60 * 1000;

const nowEl = document.getElementById("now");
const avatarPreview = document.getElementById("avatarPreview");
const avatarInput = document.getElementById("avatarInput");
const clearAvatar = document.getElementById("clearAvatar");
const nameInput = document.getElementById("nameInput");
const signatureInput = document.getElementById("signatureInput");
const createForm = document.getElementById("createForm");
const timerNameInput = document.getElementById("timerName");
const countdownList = document.getElementById("countdownList");
const template = document.getElementById("countdownTemplate");

let state = loadState();

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.main?.startAt && Array.isArray(parsed?.timers)) {
        return parsed;
      }
    } catch (err) {
      console.warn("Failed to parse storage", err);
    }
  }
  const initial = {
    profile: {
      name: "",
      signature: "",
      avatar: "",
    },
    main: {
      id: "main",
      name: "一万小时",
      startAt: Date.now(),
      comments: [],
    },
    timers: [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDateTime(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

function formatDuration(ms) {
  const safe = Math.max(ms, 0);
  const totalSeconds = Math.floor(safe / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    days,
    hours,
    minutes,
    seconds,
  };
}

function updateClock() {
  const now = new Date();
  nowEl.textContent = now.toLocaleString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function renderProfile() {
  nameInput.value = state.profile.name;
  signatureInput.value = state.profile.signature;
  if (state.profile.avatar) {
    avatarPreview.innerHTML = `<img src="${state.profile.avatar}" alt="头像" />`;
  } else {
    avatarPreview.textContent = "无";
  }
}

function buildCountdownCard(item) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.id = item.id;
  node.querySelector(".cd-title").textContent = item.name;
  const start = formatDateTime(item.startAt);
  const end = formatDateTime(item.startAt + TOTAL_MS);
  node.querySelector(".cd-meta").textContent = `开始：${start} · 结束：${end}`;
  const commentList = node.querySelector(".comment-list");
  if (item.comments.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "暂无评论";
    empty.style.color = "#8b8b8b";
    commentList.appendChild(empty);
  } else {
    item.comments.slice().reverse().forEach((c) => {
      const li = document.createElement("li");
      li.textContent = c.text;
      const meta = document.createElement("span");
      meta.className = "comment-meta";
      meta.textContent = formatDateTime(c.ts);
      li.appendChild(meta);
      commentList.appendChild(li);
    });
  }
  const form = node.querySelector(".comment-form");
  const input = form.querySelector("input");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addComment(item.id, text);
    input.value = "";
    renderCountdowns();
  });
  return node;
}

function renderCountdowns() {
  countdownList.innerHTML = "";
  const items = [state.main, ...state.timers];
  items.forEach((item) => {
    countdownList.appendChild(buildCountdownCard(item));
  });
  updateCountdowns();
}

function updateCountdowns() {
  const now = Date.now();
  const items = [state.main, ...state.timers];
  items.forEach((item) => {
    const card = countdownList.querySelector(`[data-id="${item.id}"]`);
    if (!card) return;
    const endAt = item.startAt + TOTAL_MS;
    const remainingMs = endAt - now;
    const duration = formatDuration(remainingMs);
    const remainingText = `剩余：${duration.days}天 ${String(duration.hours).padStart(2, "0")}:${String(duration.minutes).padStart(2, "0")}:${String(duration.seconds).padStart(2, "0")}`;
    card.querySelector(".remaining").textContent = remainingText;

    const elapsed = Math.min(Math.max(now - item.startAt, 0), TOTAL_MS);
    const percent = Math.floor((elapsed / TOTAL_MS) * 100);
    card.querySelector(".percent").textContent = `${percent}%`;
    card.querySelector(".fill").style.width = `${percent}%`;
    const status = remainingMs <= 0 ? "已完成" : "进行中";
    card.querySelector(".status").textContent = status;
  });
}

function addComment(id, text) {
  const target = id === "main" ? state.main : state.timers.find((t) => t.id === id);
  if (!target) return;
  target.comments.push({
    text,
    ts: Date.now(),
  });
  saveState();
}

nameInput.addEventListener("input", (e) => {
  state.profile.name = e.target.value.trim();
  saveState();
});

signatureInput.addEventListener("input", (e) => {
  state.profile.signature = e.target.value.trim();
  saveState();
});

avatarInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.profile.avatar = String(reader.result || "");
    saveState();
    renderProfile();
  };
  reader.readAsDataURL(file);
});

clearAvatar.addEventListener("click", () => {
  state.profile.avatar = "";
  saveState();
  renderProfile();
});

createForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = timerNameInput.value.trim();
  if (!name) return;
  state.timers.unshift({
    id: `t_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    name,
    startAt: Date.now(),
    comments: [],
  });
  timerNameInput.value = "";
  saveState();
  renderCountdowns();
});

function init() {
  renderProfile();
  renderCountdowns();
  updateClock();
  setInterval(() => {
    updateClock();
    updateCountdowns();
  }, 1000);
}

init();

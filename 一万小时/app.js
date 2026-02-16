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
const timerStartInput = document.getElementById("timerStart");
const countdownList = document.getElementById("countdownList");
const template = document.getElementById("countdownTemplate");

let state = loadState();

function normalizeComments(list) {
  if (!Array.isArray(list)) return [];
  return list.map((c) => {
    if (typeof c === "string") {
      return { text: c, ts: Date.now() };
    }
    return {
      text: String(c?.text ?? ""),
      ts: typeof c?.ts === "number" ? c.ts : Date.now(),
      remainingMs: typeof c?.remainingMs === "number" ? c.remainingMs : null,
      elapsedMs: typeof c?.elapsedMs === "number" ? c.elapsedMs : null,
    };
  });
}

function normalizeItem(raw, fallbackId) {
  if (!raw) return null;
  const startAt = typeof raw.startAt === "number" ? raw.startAt : Date.now();
  return {
    id: raw.id || fallbackId || `t_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    name: String(raw.name || "未命名"),
    startAt,
    comments: normalizeComments(raw.comments),
    pausedAt: typeof raw.pausedAt === "number" ? raw.pausedAt : null,
    pausedTotal: Number.isFinite(raw.pausedTotal) ? raw.pausedTotal : 0,
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed?.timers)) {
        const profile = {
          name: String(parsed?.profile?.name ?? ""),
          signature: String(parsed?.profile?.signature ?? ""),
          avatar: String(parsed?.profile?.avatar ?? ""),
        };
        let main = null;
        if (Object.prototype.hasOwnProperty.call(parsed, "main")) {
          main = parsed.main ? normalizeItem(parsed.main, "main") : null;
        } else {
          main = normalizeItem(
            { id: "main", name: "一万小时", startAt: Date.now(), comments: [] },
            "main"
          );
        }
        const timers = parsed.timers.map((t) => normalizeItem(t)).filter(Boolean);
        return { profile, main, timers };
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
      pausedAt: null,
      pausedTotal: 0,
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

function formatDateTimeInput(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function parseDateTimeInput(value) {
  if (!value) return null;
  const parsed = new Date(value);
  const ts = parsed.getTime();
  if (Number.isNaN(ts)) return null;
  return ts;
}

function pad2(value) {
  return String(value).padStart(2, "0");
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

function formatDurationText(ms) {
  const duration = formatDuration(ms);
  return `${duration.days}天 ${pad2(duration.hours)}:${pad2(duration.minutes)}:${pad2(duration.seconds)}`;
}

function getEffectiveNow(item, now) {
  if (item.pausedAt) {
    return item.pausedAt;
  }
  return now;
}

function getElapsedMs(item, now) {
  const effectiveNow = getEffectiveNow(item, now);
  const elapsed = effectiveNow - item.startAt - (item.pausedTotal || 0);
  return Math.min(Math.max(elapsed, 0), TOTAL_MS);
}

function getRemainingMs(item, now) {
  return Math.max(TOTAL_MS - getElapsedMs(item, now), 0);
}

function getEndAt(item, now) {
  let pauseExtra = item.pausedTotal || 0;
  if (item.pausedAt) {
    pauseExtra += now - item.pausedAt;
  }
  return item.startAt + TOTAL_MS + pauseExtra;
}

function getItems() {
  const items = [];
  if (state.main) items.push(state.main);
  return items.concat(state.timers);
}

function findItemById(id) {
  if (id === "main") return state.main;
  return state.timers.find((t) => t.id === id) || null;
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
  const nameInput = node.querySelector(".name-input");
  nameInput.value = item.name;
  const startInput = node.querySelector(".start-input");
  startInput.value = formatDateTimeInput(item.startAt);
  const setNameBtn = node.querySelector(".set-name");
  const setStartBtn = node.querySelector(".set-start");
  const pauseBtn = node.querySelector(".toggle-pause");
  const deleteBtn = node.querySelector(".delete-timer");

  setNameBtn.addEventListener("click", () => {
    const nextName = nameInput.value.trim();
    if (!nextName) return;
    item.name = nextName;
    saveState();
    renderCountdowns();
  });

  setStartBtn.addEventListener("click", () => {
    const nextStart = parseDateTimeInput(startInput.value);
    if (!nextStart) return;
    item.startAt = nextStart;
    item.pausedAt = null;
    item.pausedTotal = 0;
    saveState();
    renderCountdowns();
  });

  pauseBtn.addEventListener("click", () => {
    const now = Date.now();
    const elapsed = getElapsedMs(item, now);
    if (elapsed >= TOTAL_MS) return;
    if (item.pausedAt) {
      item.pausedTotal += now - item.pausedAt;
      item.pausedAt = null;
    } else {
      item.pausedAt = now;
    }
    saveState();
    renderCountdowns();
  });

  deleteBtn.addEventListener("click", () => {
    const label = item.name ? `「${item.name}」` : "该";
    if (!window.confirm(`确定删除${label}倒计时？此操作不可撤销。`)) {
      return;
    }
    if (item.id === "main") {
      state.main = null;
    } else {
      state.timers = state.timers.filter((t) => t.id !== item.id);
    }
    saveState();
    renderCountdowns();
  });

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
      if (typeof c.elapsedMs === "number" || typeof c.remainingMs === "number") {
        const elapsedRaw =
          typeof c.elapsedMs === "number" ? c.elapsedMs : TOTAL_MS - (c.remainingMs ?? 0);
        const remainingRaw =
          typeof c.remainingMs === "number" ? c.remainingMs : TOTAL_MS - (c.elapsedMs ?? 0);
        const elapsed = Math.min(Math.max(elapsedRaw, 0), TOTAL_MS);
        const remaining = Math.max(remainingRaw, 0);
        meta.textContent = `${formatDateTime(c.ts)} · 已完成 ${formatDurationText(elapsed)} · 剩余 ${formatDurationText(remaining)}`;
      } else {
        meta.textContent = formatDateTime(c.ts);
      }
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
  const items = getItems();
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "暂无倒计时，创建一个开始吧。";
    countdownList.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    countdownList.appendChild(buildCountdownCard(item));
  });
  updateCountdowns();
}

function updateCountdowns() {
  const now = Date.now();
  const items = getItems();
  items.forEach((item) => {
    const card = countdownList.querySelector(`[data-id="${item.id}"]`);
    if (!card) return;
    const displayNow = getEffectiveNow(item, now);
    const remainingMs = getRemainingMs(item, now);
    const remainingText = `剩余：${formatDurationText(remainingMs)}`;
    card.querySelector(".remaining").textContent = remainingText;
    const meta = card.querySelector(".cd-meta");
    if (meta) {
      meta.textContent = `开始：${formatDateTime(item.startAt)} · 结束：${formatDateTime(getEndAt(item, displayNow))}`;
    }

    const elapsed = getElapsedMs(item, now);
    const percent = Math.floor((elapsed / TOTAL_MS) * 100);
    card.querySelector(".percent").textContent = `${percent}%`;
    card.querySelector(".fill").style.width = `${percent}%`;
    let status = "进行中";
    if (now < item.startAt) {
      status = "未开始";
    } else if (remainingMs <= 0) {
      status = "已完成";
    } else if (item.pausedAt) {
      status = "已暂停";
    }
    card.querySelector(".status").textContent = status;

    const pauseBtn = card.querySelector(".toggle-pause");
    if (pauseBtn) {
      pauseBtn.textContent = item.pausedAt ? "继续" : "暂停";
      pauseBtn.disabled = remainingMs <= 0;
    }
  });
}

function addComment(id, text) {
  const target = findItemById(id);
  if (!target) return;
  const now = Date.now();
  const remainingMs = getRemainingMs(target, now);
  const elapsedMs = getElapsedMs(target, now);
  target.comments.push({
    text,
    ts: now,
    remainingMs,
    elapsedMs,
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
  const startAt = parseDateTimeInput(timerStartInput.value) || Date.now();
  state.timers.unshift({
    id: `t_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    name,
    startAt,
    comments: [],
    pausedAt: null,
    pausedTotal: 0,
  });
  timerNameInput.value = "";
  timerStartInput.value = "";
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

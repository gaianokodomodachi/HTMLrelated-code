const USER_KEY = "af_users";
const POST_KEY = "af_posts";
const FORUM_KEY = "af_forum_name";
const THEME_KEY = "af_theme";
const MODE_KEY = "af_mode";
const DESC_KEY = "af_forum_desc";
const DEFAULT_FORUM_NAME = "QuoVadis";
const DEFAULT_FORUM_DESC = "匿名论坛 · 创建用户、发布帖子、自由匿名回复";
const BACKUP_AUTO_KEY = "af_backup_auto";
const BACKUP_FILENAME = "forum-backup.json";

const forumTitleEl = document.getElementById("forum-title");
const forumLogoEl = document.getElementById("forum-logo");
const forumForm = document.getElementById("forum-form");
const forumNameInput = document.getElementById("forum-name");
const forumDescInput = document.getElementById("forum-desc");
const backupAutoToggle = document.getElementById("backup-auto");
const importJsonInput = document.getElementById("import-json");
const importJsonBtn = document.getElementById("import-json-btn");
const themeSelect = document.getElementById("theme-select");
const modeSelect = document.getElementById("mode-select");
const exportTxtBtn = document.getElementById("export-txt");
const exportWordBtn = document.getElementById("export-word");
const exportPdfBtn = document.getElementById("export-pdf");
const exportJsonBtn = document.getElementById("export-json");

const userForm = document.getElementById("user-form");
const userAvatarInput = document.getElementById("user-avatar");
const userNameInput = document.getElementById("user-name");
const userSignInput = document.getElementById("user-sign");
const userListEl = document.getElementById("user-list");

const postForm = document.getElementById("post-form");
const postTitleInput = document.getElementById("post-title");
const postIntroInput = document.getElementById("post-intro");
const postTimeInput = document.getElementById("post-time");
const postAuthorTypeSelect = document.getElementById("post-author-type");
const postAuthorUserSelect = document.getElementById("post-author-user");
const postCategoriesInput = document.getElementById("post-categories");
const postImageInput = document.getElementById("post-image");
const postListEl = document.getElementById("post-list");
const categoryFiltersEl = document.getElementById("category-filters");
const clearFiltersBtn = document.getElementById("clear-filters");

const state = {
  users: [],
  posts: [],
};

const filterState = {
  categories: new Set(),
};

let backupPending = false;

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseCategories(value) {
  if (!value) {
    return [];
  }
  const parts = String(value)
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

function fallbackAnonId(post) {
  const source = String(post.id || "");
  const digitMap = "abcdefghij";
  let out = "";
  for (const ch of source) {
    if (/[A-Za-z]/.test(ch)) {
      out += ch;
    } else if (/[0-9]/.test(ch)) {
      out += digitMap[Number(ch)];
    }
    if (out.length >= 10) {
      break;
    }
  }
  const filler = "quovadis";
  while (out.length < 6) {
    out += filler;
  }
  return out.slice(0, 10);
}

function normalizeAuthor(author, post) {
  if (!author || !author.type) {
    return { type: "anon", anonId: fallbackAnonId(post) };
  }
  if (author.type === "user") {
    return { type: "user", userId: author.userId || "" };
  }
  if (author.type === "official") {
    return { type: "official" };
  }
  return { type: "anon", anonId: author.anonId || fallbackAnonId(post) };
}

function normalizePost(post) {
  const categories = Array.isArray(post.categories)
    ? post.categories
    : parseCategories(post.categories);
  const author = normalizeAuthor(post.author, post);
  return {
    ...post,
    time: post.time || "",
    image: post.image || "",
    replies: normalizeReplies(post.replies),
    categories,
    author,
  };
}

function normalizeReply(reply) {
  const author = normalizeAuthor(reply.author, reply);
  return {
    ...reply,
    author,
    replyTo: reply.replyTo || "",
    image: reply.image || "",
    replies: normalizeReplies(reply.replies),
  };
}

function normalizeReplies(replies) {
  if (!Array.isArray(replies)) {
    return [];
  }
  return replies.map((reply) => normalizeReply(reply));
}

function getAllCategories() {
  const set = new Set();
  state.posts.forEach((post) => {
    post.categories.forEach((cat) => set.add(cat));
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function loadState() {
  state.users = JSON.parse(localStorage.getItem(USER_KEY) || "[]");
  state.posts = JSON.parse(localStorage.getItem(POST_KEY) || "[]").map(normalizePost);
}

function saveUsers() {
  localStorage.setItem(USER_KEY, JSON.stringify(state.users));
  requestBackup();
}

function savePosts() {
  localStorage.setItem(POST_KEY, JSON.stringify(state.posts));
  requestBackup();
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function randomSystemId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const length = Math.floor(Math.random() * 5) + 6; // 6-10
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

function applyForumName(name) {
  const finalName = name && name.trim() ? name.trim() : DEFAULT_FORUM_NAME;
  forumTitleEl.textContent = finalName;
  document.title = finalName;
  const logoText = finalName.replace(/\s+/g, "").slice(0, 2).toUpperCase() || "QV";
  forumLogoEl.textContent = logoText;
}

function applyForumDesc(desc) {
  const finalDesc = desc && desc.trim() ? desc.trim() : DEFAULT_FORUM_DESC;
  const subtitle = document.getElementById("forum-subtitle");
  if (subtitle) {
    subtitle.textContent = finalDesc;
  }
}

function applyTheme(theme) {
  const finalTheme = theme && theme.trim() ? theme.trim() : "neon";
  document.body.dataset.theme = finalTheme;
}

function applyMode(mode) {
  const finalMode = mode === "spectator" ? "spectator" : "admin";
  document.body.dataset.mode = finalMode;
}

function isSpectator() {
  return document.body.dataset.mode === "spectator";
}

function guardSpectator(message) {
  if (!isSpectator()) {
    return false;
  }
  alert(message || "旁观者模式无法进行该操作。");
  return true;
}

function getForumName() {
  return forumTitleEl.textContent || DEFAULT_FORUM_NAME;
}

function getForumDesc() {
  const stored = localStorage.getItem(DESC_KEY);
  if (stored && stored.trim()) {
    return stored.trim();
  }
  const subtitle = document.getElementById("forum-subtitle");
  return subtitle?.textContent || DEFAULT_FORUM_DESC;
}

function isAutoBackupEnabled() {
  return localStorage.getItem(BACKUP_AUTO_KEY) === "true";
}

function requestBackup() {
  if (isSpectator() || !isAutoBackupEnabled()) {
    return;
  }
  if (backupPending) {
    return;
  }
  backupPending = true;
  setTimeout(() => {
    backupPending = false;
    if (!isAutoBackupEnabled()) {
      return;
    }
    if (!confirm("是否备份当前数据到 JSON 文件？")) {
      return;
    }
    const payload = JSON.stringify(buildExportData(), null, 2);
    downloadFile(BACKUP_FILENAME, payload, "application/json");
  }, 0);
}

function renderPostAuthorOptions() {
  if (!postAuthorUserSelect) {
    return;
  }
  if (!state.users.length) {
    postAuthorUserSelect.innerHTML = '<option value="">暂无用户</option>';
  } else {
    postAuthorUserSelect.innerHTML = state.users
      .map((user) => `<option value="${user.id}">${escapeHTML(user.name)}</option>`)
      .join("");
  }

  if (postAuthorTypeSelect) {
    const useUser = postAuthorTypeSelect.value === "user";
    postAuthorUserSelect.disabled = !useUser || !state.users.length;
  }
}

function renderUsers() {
  if (!state.users.length) {
    userListEl.innerHTML = '<div class="empty">还没有创建用户。</div>';
    renderPostAuthorOptions();
    return;
  }

  userListEl.innerHTML = state.users
    .map((user) => {
      const safeName = escapeHTML(user.name);
      const safeSign = escapeHTML(user.sign || "");
      const initial = safeName ? safeName.slice(0, 1).toUpperCase() : "U";
      return `
        <div class="user-card" data-user-id="${user.id}">
          <div class="avatar">${user.avatar ? `<img src="${user.avatar}" alt="${safeName}" />` : initial}</div>
          <div class="user-info">
            <div><strong>${safeName}</strong></div>
            <div class="muted">${safeSign}</div>
            <div class="user-actions mode-hide">
              <button type="button" class="ghost" data-action="edit-user" data-id="${user.id}">编辑</button>
              <button type="button" class="ghost danger" data-action="delete-user" data-id="${user.id}">删除</button>
            </div>
            <form class="user-edit hidden mode-hide" data-user-id="${user.id}">
              <label class="field">
                <span>姓名</span>
                <input type="text" name="name" maxlength="20" value="${safeName}" required />
              </label>
              <label class="field">
                <span>个人签名（可选）</span>
                <input type="text" name="sign" maxlength="60" value="${safeSign}" />
              </label>
              <label class="field">
                <span>头像（可选替换）</span>
                <input type="file" name="avatar" accept="image/*" />
              </label>
              <div class="actions">
                <button type="submit" class="primary">保存</button>
                <button type="button" class="ghost" data-action="cancel-user" data-id="${user.id}">取消</button>
              </div>
            </form>
          </div>
        </div>
      `;
    })
    .join("");
  renderPostAuthorOptions();
}

function renderTagList(tags) {
  if (!tags.length) {
    return '<div class="muted">分类：无</div>';
  }
  return `<div class="tag-list">${tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div>`;
}

function renderCategoryFilters() {
  if (!categoryFiltersEl) {
    return;
  }
  const categories = getAllCategories();
  const hasNone = state.posts.some((post) => !post.categories.length);
  const entries = [...categories];
  if (hasNone) {
    entries.push("__none__");
  }

  if (entries.length) {
    const valid = new Set(entries);
    filterState.categories.forEach((cat) => {
      if (!valid.has(cat)) {
        filterState.categories.delete(cat);
      }
    });
  } else if (filterState.categories.size) {
    filterState.categories.clear();
  }

  if (!entries.length) {
    categoryFiltersEl.innerHTML = '<div class="muted">暂无分类。</div>';
    return;
  }

  categoryFiltersEl.innerHTML = entries
    .map((cat) => {
      const label = cat === "__none__" ? "无分类" : cat;
      const checked = filterState.categories.has(cat);
      const encoded = encodeURIComponent(cat);
      return `
        <label class="chip">
          <input type="checkbox" data-cat="${encoded}" ${checked ? "checked" : ""} />
          <span>${escapeHTML(label)}</span>
        </label>
      `;
    })
    .join("");
}

function matchPostFilter(post) {
  if (!filterState.categories.size) {
    return true;
  }
  if (filterState.categories.has("__none__") && post.categories.length === 0) {
    return true;
  }
  return post.categories.some((cat) => filterState.categories.has(cat));
}

function renderPosts() {
  renderCategoryFilters();
  if (!state.posts.length) {
    postListEl.innerHTML = '<div class="empty">暂无帖子，去发布第一条吧。</div>';
    return;
  }

  postListEl.innerHTML = "";

  const filteredPosts = state.posts
    .slice()
    .filter(matchPostFilter)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (!filteredPosts.length) {
    postListEl.innerHTML = '<div class="empty">没有符合筛选条件的帖子。</div>';
    return;
  }

  filteredPosts.forEach((post) => {
      const card = document.createElement("div");
      card.className = "post-card";

      const safeTitle = escapeHTML(post.title);
      const safeIntro = escapeHTML(post.intro);
      const detailUrl = `post.html?id=${encodeURIComponent(post.id)}`;

      card.innerHTML = `
        <a class="post-link" href="${detailUrl}">
          <h3>${safeTitle}</h3>
          <div class="post-intro">${safeIntro}</div>
          ${post.image ? `<div class="post-image"><img src="${post.image}" alt="${safeTitle}" /></div>` : ""}
        </a>
      `;

      postListEl.appendChild(card);
    });
}

function formatPostAuthor(author) {
  if (!author || !author.type) {
    return "匿名";
  }
  if (author.type === "official") {
    return "官方";
  }
  if (author.type === "user") {
    const user = state.users.find((u) => u.id === author.userId);
    return `用户 ${user?.name || "已删除用户"}`;
  }
  return `匿名 ${author.anonId || "未知"}`;
}

function formatReplyAuthor(author) {
  if (!author || !author.type) {
    return "匿名";
  }
  if (author.type === "official") {
    return "官方";
  }
  if (author.type === "user") {
    const user = state.users.find((u) => u.id === author.userId);
    return `用户 ${user?.name || "已删除用户"}`;
  }
  return `匿名 ${author.anonId || "未知"}`;
}

function appendRepliesText(lines, replies, depth) {
  const indent = "  ".repeat(depth);
  replies.forEach((reply) => {
    const note = reply.image ? " [图片]" : "";
    lines.push(`${indent}- ${formatReplyAuthor(reply.author)}：${reply.content}${note}`);
    if (reply.replies && reply.replies.length) {
      appendRepliesText(lines, reply.replies, depth + 1);
    }
  });
}

function renderRepliesHtml(replies) {
  if (!replies.length) {
    return "<li>暂无回复</li>";
  }
  return replies
    .map((reply) => {
      const image = reply.image ? `<div><img src="${reply.image}" alt="reply image" /></div>` : "";
      const children = reply.replies && reply.replies.length ? `<ul>${renderRepliesHtml(reply.replies)}</ul>` : "";
      return `<li><strong>${escapeHTML(formatReplyAuthor(reply.author))}</strong>：${escapeHTML(reply.content)}${image}${children}</li>`;
    })
    .join("");
}

function countReplies(replies) {
  return replies.reduce((total, reply) => total + 1 + countReplies(reply.replies || []), 0);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function buildExportData() {
  return {
    forumName: getForumName(),
    forumDesc: getForumDesc(),
    exportedAt: new Date().toISOString(),
    users: state.users,
    posts: state.posts,
  };
}

function applyImportedData(data) {
  if (!data || typeof data !== "object") {
    alert("导入失败：JSON 格式不正确。");
    return;
  }

  if (data.forumName) {
    localStorage.setItem(FORUM_KEY, data.forumName);
    applyForumName(data.forumName);
    forumNameInput.value = data.forumName;
  }

  if (data.forumDesc) {
    localStorage.setItem(DESC_KEY, data.forumDesc);
    applyForumDesc(data.forumDesc);
    if (forumDescInput) {
      forumDescInput.value = data.forumDesc;
    }
  }

  if (Array.isArray(data.users)) {
    state.users = data.users;
  }

  if (Array.isArray(data.posts)) {
    state.posts = data.posts.map(normalizePost);
  }

  saveUsers();
  savePosts();
  renderUsers();
  renderPostAuthorOptions();
  renderPosts();
}

function buildExportText() {
  const lines = [];
  lines.push(`论坛：${getForumName()}`);
  lines.push(`导出时间：${new Date().toLocaleString()}`);
  lines.push("");
  lines.push("用户：");
  if (!state.users.length) {
    lines.push("（无）");
  } else {
    state.users.forEach((user, index) => {
      lines.push(`${index + 1}. ${user.name} | ${user.sign}`);
    });
  }
  lines.push("");
  lines.push("帖子：");
  if (!state.posts.length) {
    lines.push("（无）");
  } else {
    state.posts
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((post, index) => {
        lines.push(`${index + 1}. ${post.title}`);
        lines.push(`   作者：${formatPostAuthor(post.author)}`);
        lines.push(`   时间：${post.time || "未填写"}`);
        lines.push(`   分类：${post.categories.length ? post.categories.join("，") : "无"}`);
        lines.push(`   简介：${post.intro}`);
        lines.push(`   回复数：${countReplies(post.replies)}`);
        if (post.replies.length) {
          appendRepliesText(lines, post.replies, 2);
        }
        lines.push("");
      });
  }
  return lines.join("\n");
}

function buildExportHtml() {
  const userBlocks = state.users.length
    ? state.users
        .map(
          (user) => `
          <div class="card">
            <h3>${escapeHTML(user.name)}</h3>
            <p>${escapeHTML(user.sign)}</p>
            ${user.avatar ? `<img src="${user.avatar}" alt="${escapeHTML(user.name)}" />` : ""}
          </div>
        `
        )
        .join("")
    : "<p>暂无用户。</p>";

  const postBlocks = state.posts.length
    ? state.posts
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
      .map((post) => {
          const replies = renderRepliesHtml(post.replies);
          const categories = post.categories.length ? post.categories.join("，") : "无";
          return `
            <div class="card">
              <h3>${escapeHTML(post.title)}</h3>
              <p><strong>作者：</strong>${escapeHTML(formatPostAuthor(post.author))}</p>
              <p><strong>时间：</strong>${escapeHTML(post.time || "未填写")}</p>
              <p><strong>分类：</strong>${escapeHTML(categories)}</p>
              <p><strong>简介：</strong>${escapeHTML(post.intro)}</p>
              ${post.image ? `<img src="${post.image}" alt="${escapeHTML(post.title)}" />` : ""}
              <ul>${replies}</ul>
            </div>
          `;
        })
        .join("")
    : "<p>暂无帖子。</p>";

  return `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHTML(getForumName())} 导出</title>
        <style>
          body { font-family: "Times New Roman", serif; padding: 24px; color: #2a2018; }
          h1 { margin-top: 0; }
          .section { margin: 24px 0; }
          .card { border: 1px solid #e2d6c5; border-radius: 12px; padding: 12px 16px; margin-bottom: 12px; }
          img { max-width: 100%; height: auto; border-radius: 8px; margin-top: 8px; }
          ul { padding-left: 20px; }
        </style>
      </head>
      <body>
        <h1>${escapeHTML(getForumName())}</h1>
        <p>导出时间：${new Date().toLocaleString()}</p>
        <div class="section">
          <h2>用户</h2>
          ${userBlocks}
        </div>
        <div class="section">
          <h2>帖子</h2>
          ${postBlocks}
        </div>
      </body>
    </html>
  `;
}

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (guardSpectator("旁观者模式无法创建用户。")) {
    return;
  }
  const name = userNameInput.value.trim();
  const sign = userSignInput.value.trim();
  const avatarFile = userAvatarInput.files[0];

  if (!name) {
    alert("请填写姓名。");
    return;
  }

  try {
    const avatar = avatarFile ? await readFileAsDataUrl(avatarFile) : "";
    state.users.push({
      id: createId("user"),
      name,
      sign,
      avatar,
      createdAt: Date.now(),
    });
    saveUsers();
    userForm.reset();
    renderUsers();
    renderPosts();
  } catch (error) {
    alert("头像读取失败，请重试。");
  }
});

userListEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  if (guardSpectator("旁观者模式无法编辑或删除用户。")) {
    return;
  }
  const action = button.dataset.action;
  const userId = button.dataset.id;
  if (!action || !userId) {
    return;
  }
  const form = userListEl.querySelector(`.user-edit[data-user-id="${userId}"]`);

  if (action === "edit-user" && form) {
    form.classList.remove("hidden");
  }

  if (action === "cancel-user" && form) {
    form.classList.add("hidden");
  }

  if (action === "delete-user") {
    const user = state.users.find((item) => item.id === userId);
    if (!user) {
      return;
    }
    if (!confirm(`确定删除用户 “${user.name}” 吗？`)) {
      return;
    }
    state.users = state.users.filter((item) => item.id !== userId);
    saveUsers();
    renderUsers();
    renderPosts();
  }
});

userListEl.addEventListener("submit", async (event) => {
  if (!event.target.matches(".user-edit")) {
    return;
  }
  event.preventDefault();
  if (guardSpectator("旁观者模式无法编辑用户。")) {
    return;
  }
  const form = event.target;
  const userId = form.dataset.userId;
  const name = form.name.value.trim();
  const sign = form.sign.value.trim();
  const avatarFile = form.avatar.files[0];

  if (!name) {
    alert("姓名不能为空。");
    return;
  }

  const userIndex = state.users.findIndex((item) => item.id === userId);
  if (userIndex === -1) {
    return;
  }

  let avatar = state.users[userIndex].avatar;
  if (avatarFile) {
    try {
      avatar = await readFileAsDataUrl(avatarFile);
    } catch (error) {
      alert("头像读取失败，将保留原头像。");
    }
  }

  state.users[userIndex] = {
    ...state.users[userIndex],
    name,
    sign,
    avatar,
  };

  saveUsers();
  renderUsers();
  renderPosts();
});

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (guardSpectator("旁观者模式无法发布帖子。")) {
    return;
  }
  const title = postTitleInput.value.trim();
  const intro = postIntroInput.value.trim();
  const time = postTimeInput.value.trim();
  const authorType = postAuthorTypeSelect ? postAuthorTypeSelect.value : "anon";
  const categories = parseCategories(postCategoriesInput.value);
  const imageFile = postImageInput.files[0];

  if (!title || !intro) {
    alert("请填写标题和简介。");
    return;
  }

  let author = { type: "anon", anonId: randomSystemId() };
  if (authorType === "user") {
    const userId = postAuthorUserSelect ? postAuthorUserSelect.value : "";
    if (!userId) {
      alert("请选择用户作为发布身份。");
      return;
    }
    author = { type: "user", userId };
  } else if (authorType === "official") {
    author = { type: "official" };
  }

  let image = "";
  if (imageFile) {
    try {
      image = await readFileAsDataUrl(imageFile);
    } catch (error) {
      alert("配图读取失败，将跳过配图。");
    }
  }

  state.posts.push({
    id: createId("post"),
    title,
    intro,
    time,
    image,
    categories,
    author,
    createdAt: Date.now(),
    replies: [],
  });

  savePosts();
  postForm.reset();
  renderPostAuthorOptions();
  renderPosts();
});

forumForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (guardSpectator("旁观者模式无法修改论坛设置。")) {
    return;
  }
  const name = forumNameInput.value.trim();
  const desc = forumDescInput ? forumDescInput.value.trim() : "";
  if (!name) {
    localStorage.removeItem(FORUM_KEY);
    applyForumName("");
    forumNameInput.value = "";
  } else {
    localStorage.setItem(FORUM_KEY, name);
    applyForumName(name);
  }
  if (forumDescInput) {
    if (!desc) {
      localStorage.removeItem(DESC_KEY);
      applyForumDesc("");
      forumDescInput.value = "";
    } else {
      localStorage.setItem(DESC_KEY, desc);
      applyForumDesc(desc);
    }
  }
  requestBackup();
});

exportTxtBtn.addEventListener("click", () => {
  downloadFile("forum-data.txt", "\ufeff" + buildExportText(), "text/plain");
});

exportWordBtn.addEventListener("click", () => {
  downloadFile("forum-data.doc", "\ufeff" + buildExportHtml(), "application/msword");
});

exportJsonBtn.addEventListener("click", () => {
  downloadFile("forum-data.json", JSON.stringify(buildExportData(), null, 2), "application/json");
});

exportPdfBtn.addEventListener("click", () => {
  const html = buildExportHtml();
  const win = window.open("", "_blank");
  if (!win) {
    alert("请允许浏览器弹窗以导出 PDF。");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
});

if (categoryFiltersEl) {
  categoryFiltersEl.addEventListener("change", (event) => {
    const input = event.target;
    if (!input.matches("input[data-cat]")) {
      return;
    }
    const cat = decodeURIComponent(input.dataset.cat || "");
    if (!cat) {
      return;
    }
    if (input.checked) {
      filterState.categories.add(cat);
    } else {
      filterState.categories.delete(cat);
    }
    renderPosts();
  });
}

if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    filterState.categories.clear();
    renderPosts();
  });
}

if (postAuthorTypeSelect) {
  postAuthorTypeSelect.addEventListener("change", () => {
    renderPostAuthorOptions();
  });
}

if (themeSelect) {
  themeSelect.addEventListener("change", () => {
    const value = themeSelect.value || "neon";
    localStorage.setItem(THEME_KEY, value);
    applyTheme(value);
  });
}

if (modeSelect) {
  modeSelect.addEventListener("change", () => {
    const value = modeSelect.value || "admin";
    localStorage.setItem(MODE_KEY, value);
    applyMode(value);
  });
}

if (backupAutoToggle) {
  backupAutoToggle.addEventListener("change", () => {
    if (guardSpectator("旁观者模式无法修改备份设置。")) {
      return;
    }
    localStorage.setItem(BACKUP_AUTO_KEY, backupAutoToggle.checked ? "true" : "false");
  });
}

if (importJsonBtn) {
  importJsonBtn.addEventListener("click", () => {
    if (guardSpectator("旁观者模式无法导入数据。")) {
      return;
    }
    const file = importJsonInput?.files?.[0];
    if (!file) {
      alert("请先选择 JSON 文件。");
      return;
    }
    if (!confirm("导入将覆盖当前数据，确定继续吗？")) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        applyImportedData(data);
        if (importJsonInput) {
          importJsonInput.value = "";
        }
      } catch (error) {
        alert("导入失败：JSON 解析错误。");
      }
    };
    reader.onerror = () => {
      alert("导入失败：文件读取错误。");
    };
    reader.readAsText(file);
  });
}

const storedForumName = localStorage.getItem(FORUM_KEY) || "";
forumNameInput.value = storedForumName;
applyForumName(storedForumName);
const storedDesc = localStorage.getItem(DESC_KEY) || "";
if (forumDescInput) {
  forumDescInput.value = storedDesc;
}
applyForumDesc(storedDesc);
const storedTheme = localStorage.getItem(THEME_KEY) || "neon";
if (themeSelect) {
  themeSelect.value = storedTheme;
}
applyTheme(storedTheme);
const storedMode = localStorage.getItem(MODE_KEY) || "admin";
if (modeSelect) {
  modeSelect.value = storedMode;
}
applyMode(storedMode);
if (backupAutoToggle) {
  backupAutoToggle.checked = localStorage.getItem(BACKUP_AUTO_KEY) === "true";
}
loadState();
renderUsers();
renderPostAuthorOptions();
renderPosts();

const USER_KEY = "af_users";
const POST_KEY = "af_posts";
const FORUM_KEY = "af_forum_name";
const LAST_POST_KEY = "af_last_post_id";
const THEME_KEY = "af_theme";
const MODE_KEY = "af_mode";
const DESC_KEY = "af_forum_desc";
const DEFAULT_FORUM_NAME = "QuoVadis";
const DEFAULT_FORUM_DESC = "匿名论坛 · 创建用户、发布帖子、自由匿名回复";
const BACKUP_AUTO_KEY = "af_backup_auto";
const BACKUP_FILENAME = "forum-backup.json";

const forumTitleEl = document.getElementById("forum-title");
const forumLogoEl = document.getElementById("forum-logo");
const themeSelect = document.getElementById("theme-select");

const postTitleEl = document.getElementById("post-title");
const postMetaEl = document.getElementById("post-meta");
const postIntroEl = document.getElementById("post-intro");
const postImageEl = document.getElementById("post-image");
const postTagsEl = document.getElementById("post-tags");
const postActionsEl = document.getElementById("post-actions");
const editPostBtn = document.getElementById("edit-post");
const deletePostBtn = document.getElementById("delete-post");
const postEditForm = document.getElementById("post-edit-form");
const cancelPostBtn = document.getElementById("cancel-post");

const replyForm = document.getElementById("reply-form");
const replyAuthorTypeSelect = document.getElementById("reply-author-type");
const replyAuthorUserSelect = document.getElementById("reply-author-user");
const replyImageInput = document.getElementById("reply-image");
const replyTargetBox = document.getElementById("reply-target");
const replyTargetName = document.getElementById("reply-target-name");
const clearReplyTargetBtn = document.getElementById("clear-reply-target");
const replyModeBox = document.getElementById("reply-mode");
const replyListEl = document.getElementById("reply-list");
const replyTemplate = document.getElementById("reply-item-template");
const postAuthorTypeSelect = postEditForm ? postEditForm.authorType : null;
const postAuthorUserSelect = postEditForm ? postEditForm.authorUser : null;
const imageViewer = document.getElementById("image-viewer");
const imageViewerImg = imageViewer ? imageViewer.querySelector("img") : null;
const imageViewerClose = imageViewer ? imageViewer.querySelector(".image-viewer-close") : null;
const imageViewerBackdrop = imageViewer ? imageViewer.querySelector(".image-viewer-backdrop") : null;

const state = {
  users: [],
  posts: [],
};

let backupPending = false;

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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

function loadState() {
  state.users = JSON.parse(localStorage.getItem(USER_KEY) || "[]");
  state.posts = JSON.parse(localStorage.getItem(POST_KEY) || "[]").map(normalizePost);
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
    subtitle.textContent = `${finalDesc} · 帖子详情`;
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

function getStoredForumName() {
  const stored = localStorage.getItem(FORUM_KEY);
  return stored && stored.trim() ? stored.trim() : DEFAULT_FORUM_NAME;
}

function getStoredForumDesc() {
  const stored = localStorage.getItem(DESC_KEY);
  return stored && stored.trim() ? stored.trim() : DEFAULT_FORUM_DESC;
}

function buildExportData() {
  return {
    forumName: getStoredForumName(),
    forumDesc: getStoredForumDesc(),
    exportedAt: new Date().toISOString(),
    users: state.users,
    posts: state.posts,
  };
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
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = BACKUP_FILENAME;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }, 0);
}

function getPostId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id) {
    try {
      sessionStorage.setItem(LAST_POST_KEY, id);
    } catch (error) {
      // Ignore storage errors.
    }
    return id;
  }
  try {
    return sessionStorage.getItem(LAST_POST_KEY);
  } catch (error) {
    return null;
  }
}

function getPostById(postId) {
  return state.posts.find((post) => post.id === postId);
}

function renderTagList(tags) {
  if (!tags.length) {
    return '<div class="muted">分类：无</div>';
  }
  return `<div class="tag-list">${tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div>`;
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

function formatPostAuthorHtml(author) {
  if (!author || !author.type) {
    return "匿名";
  }
  if (author.type === "official") {
    return "官方";
  }
  if (author.type === "user") {
    const user = state.users.find((u) => u.id === author.userId);
    const name = user?.name || "已删除用户";
    return `用户 <strong>${escapeHTML(name)}</strong>`;
  }
  return `匿名 ${escapeHTML(author.anonId || "未知")}`;
}

function renderPostAuthorOptions() {
  if (!postAuthorUserSelect || !postAuthorTypeSelect) {
    return;
  }
  if (!state.users.length) {
    postAuthorUserSelect.innerHTML = '<option value="">暂无用户</option>';
  } else {
    postAuthorUserSelect.innerHTML = state.users
      .map((user) => `<option value="${user.id}">${escapeHTML(user.name)}</option>`)
      .join("");
  }
  const useUser = postAuthorTypeSelect.value === "user";
  postAuthorUserSelect.disabled = !useUser || !state.users.length;
}

function renderReplyAuthorOptions() {
  if (!replyAuthorUserSelect || !replyAuthorTypeSelect) {
    return;
  }
  if (!state.users.length) {
    replyAuthorUserSelect.innerHTML = '<option value="">暂无用户</option>';
  } else {
    replyAuthorUserSelect.innerHTML = state.users
      .map((user) => `<option value="${user.id}">${escapeHTML(user.name)}</option>`)
      .join("");
  }
  const useUser = replyAuthorTypeSelect.value === "user";
  replyAuthorUserSelect.disabled = !useUser || !state.users.length;
}

function setReplyTarget(replyId) {
  if (!replyTargetBox || !replyTargetName || !currentPost) {
    return;
  }
  const target = findReplyById(currentPost.replies, replyId);
  if (!target) {
    return;
  }
  replyForm.dataset.replyTargetId = replyId;
  replyTargetName.textContent = getReplyAuthorLabel(target);
  replyTargetBox.classList.remove("hidden");
  if (replyModeBox) {
    replyModeBox.classList.remove("hidden");
    const input = replyModeBox.querySelector('input[value="thread"]');
    if (input) {
      input.checked = true;
    }
  }
}

function clearReplyTarget() {
  if (!replyTargetBox) {
    return;
  }
  delete replyForm.dataset.replyTargetId;
  replyTargetBox.classList.add("hidden");
  if (replyModeBox) {
    replyModeBox.classList.add("hidden");
  }
}

function getReplyMode() {
  if (!replyModeBox) {
    return "thread";
  }
  const checked = replyModeBox.querySelector('input[name="replyMode"]:checked');
  return checked ? checked.value : "thread";
}

function renderReplyTree(replies, container, depth = 0) {
  if (!replies.length) {
    if (container === replyListEl) {
      container.innerHTML = '<div class="empty">还没有回复。</div>';
    } else {
      container.innerHTML = "";
    }
    return;
  }
  container.innerHTML = "";
  replies.forEach((reply, index) => {
    const fragment = replyTemplate.content.cloneNode(true);
    const replyEl = fragment.querySelector(".reply");
    const authorEl = fragment.querySelector(".reply-author");
    const bodyEl = fragment.querySelector(".reply-body");
    const contextEl = fragment.querySelector(".reply-context");
    const floorEl = fragment.querySelector(".reply-floor");
    const imageEl = fragment.querySelector(".reply-image");
    const editForm = fragment.querySelector(".reply-edit");
    const editTextarea = fragment.querySelector(".reply-edit textarea");
    const editPreview = fragment.querySelector(".reply-edit-preview");
    const removeImageInput = fragment.querySelector('.reply-edit input[name="removeImage"]');
    const childrenEl = fragment.querySelector(".reply-children");

    replyEl.dataset.replyId = reply.id;
    authorEl.innerHTML = renderAuthorInfo(reply);
    bodyEl.textContent = reply.content;
    if (editTextarea) {
      editTextarea.value = reply.content;
    }
    if (removeImageInput) {
      removeImageInput.checked = false;
    }
    if (editPreview) {
      if (reply.image) {
        editPreview.classList.remove("hidden");
        editPreview.innerHTML = `<img src="${reply.image}" alt="current reply image" />`;
      } else {
        editPreview.classList.add("hidden");
        editPreview.innerHTML = "";
      }
    }
    if (editForm) {
      editForm.dataset.replyId = reply.id;
    }
    if (floorEl) {
      if (depth === 0) {
        floorEl.textContent = `${index + 1}楼`;
      } else {
        floorEl.textContent = "";
      }
    }

    if (reply.replyTo && contextEl) {
      const target = findReplyById(currentPost.replies, reply.replyTo);
      const label = target ? getReplyAuthorLabel(target) : "未知";
      contextEl.textContent = `回复 ${label}`;
    } else if (contextEl) {
      contextEl.textContent = "";
    }

    if (imageEl) {
      if (reply.image) {
        imageEl.classList.remove("hidden");
        imageEl.innerHTML = `<img src="${reply.image}" alt="reply image" />`;
      } else {
        imageEl.classList.add("hidden");
        imageEl.innerHTML = "";
      }
    }

    if (childrenEl) {
      if (reply.replies && reply.replies.length) {
        renderReplyTree(reply.replies, childrenEl, depth + 1);
      } else {
        childrenEl.innerHTML = "";
      }
    }

    container.appendChild(replyEl);
  });
}

function renderAuthorInfo(reply) {
  if (reply.author.type === "official") {
    return `
      <div class="avatar">OFF</div>
      <div>
        <div><strong>官方</strong></div>
        <div class="muted">认证发布</div>
      </div>
      <span class="tag">官方</span>
    `;
  }
  if (reply.author.type === "user") {
    const user = state.users.find((u) => u.id === reply.author.userId);
    const name = user?.name || "已删除用户";
    const sign = user?.sign || "";
    const avatar = user?.avatar || "";
    const initial = name ? name.slice(0, 1).toUpperCase() : "U";
    return `
      <div class="avatar">${avatar ? `<img src="${avatar}" alt="${escapeHTML(name)}" />` : escapeHTML(initial)}</div>
      <div>
        <div><strong>${escapeHTML(name)}</strong></div>
        <div class="muted">${escapeHTML(sign)}</div>
      </div>
      <span class="tag">用户</span>
    `;
  }
  return `
    <div class="avatar">ID</div>
    <div>
      <div><strong>${escapeHTML(reply.author.anonId)}</strong></div>
      <div class="muted">系统随机ID</div>
    </div>
    <span class="tag">匿名</span>
  `;
}

function getReplyAuthorLabel(reply) {
  if (!reply || !reply.author) {
    return "未知";
  }
  if (reply.author.type === "official") {
    return "官方";
  }
  if (reply.author.type === "user") {
    const user = state.users.find((u) => u.id === reply.author.userId);
    return user?.name || "已删除用户";
  }
  return reply.author.anonId || "匿名";
}

function findReplyById(replies, replyId) {
  for (const reply of replies) {
    if (reply.id === replyId) {
      return reply;
    }
    const found = findReplyById(reply.replies || [], replyId);
    if (found) {
      return found;
    }
  }
  return null;
}

function findReplyWithParent(replies, replyId) {
  for (const reply of replies) {
    if (reply.id === replyId) {
      return { reply, parent: replies };
    }
    const found = findReplyWithParent(reply.replies || [], replyId);
    if (found) {
      return found;
    }
  }
  return null;
}

function renderPost(post) {
  if (!post) {
    postTitleEl.textContent = "帖子不存在";
    postIntroEl.textContent = "找不到该帖子，可能已被删除。";
    postMetaEl.innerHTML = "";
    postImageEl.classList.add("hidden");
    postTagsEl.innerHTML = "";
    postActionsEl.classList.add("hidden");
    postEditForm.classList.add("hidden");
    replyForm.classList.add("hidden");
    replyListEl.innerHTML = "";
    return;
  }

  postTitleEl.textContent = post.title;
  postIntroEl.textContent = post.intro;
  postMetaEl.innerHTML = `
    <span>作者：${formatPostAuthorHtml(post.author)}</span>
    <span>时间：${escapeHTML(post.time || "未填写")}</span>
    <span>回复数：${post.replies.length}</span>
  `;

  postTagsEl.innerHTML = renderTagList(post.categories);

  if (post.image) {
    postImageEl.classList.remove("hidden");
    postImageEl.innerHTML = `<img src="${post.image}" alt="${escapeHTML(post.title)}" />`;
  } else {
    postImageEl.classList.add("hidden");
    postImageEl.innerHTML = "";
  }

  postEditForm.title.value = post.title;
  postEditForm.intro.value = post.intro;
  postEditForm.time.value = post.time || "";
  postEditForm.categories.value = post.categories.join(", ");
  postEditForm.removeImage.checked = false;
  if (postAuthorTypeSelect) {
    postAuthorTypeSelect.value = post.author?.type || "anon";
  }
  renderPostAuthorOptions();
  if (postAuthorUserSelect && post.author?.type === "user") {
    postAuthorUserSelect.value = post.author.userId || "";
  }

  renderReplyAuthorOptions();
  renderReplyTree(post.replies, replyListEl);

  const replyTargetId = replyForm.dataset.replyTargetId;
  if (replyTargetId) {
    const target = findReplyById(post.replies, replyTargetId);
    if (target) {
      replyTargetName.textContent = getReplyAuthorLabel(target);
      replyTargetBox.classList.remove("hidden");
      if (replyModeBox) {
        replyModeBox.classList.remove("hidden");
      }
    } else {
      clearReplyTarget();
    }
  }
}

function ensurePost() {
  const postId = getPostId();
  if (!postId) {
    return null;
  }
  return getPostById(postId);
}

if (postAuthorTypeSelect) {
  postAuthorTypeSelect.addEventListener("change", () => {
    renderPostAuthorOptions();
  });
}

if (replyAuthorTypeSelect) {
  replyAuthorTypeSelect.addEventListener("change", () => {
    renderReplyAuthorOptions();
  });
}

if (clearReplyTargetBtn) {
  clearReplyTargetBtn.addEventListener("click", () => {
    clearReplyTarget();
  });
}

loadState();
const storedForumName = localStorage.getItem(FORUM_KEY) || "";
applyForumName(storedForumName);
const storedTheme = localStorage.getItem(THEME_KEY) || "neon";
if (themeSelect) {
  themeSelect.value = storedTheme;
}
applyTheme(storedTheme);
const storedMode = localStorage.getItem(MODE_KEY) || "admin";
applyMode(storedMode);
const storedDesc = localStorage.getItem(DESC_KEY) || "";
applyForumDesc(storedDesc);

let currentPost = ensurePost();
renderPost(currentPost);
clearReplyTarget();

if (themeSelect) {
  themeSelect.addEventListener("change", () => {
    const value = themeSelect.value || "neon";
    localStorage.setItem(THEME_KEY, value);
    applyTheme(value);
  });
}

editPostBtn.addEventListener("click", () => {
  if (!currentPost) {
    return;
  }
  if (guardSpectator("旁观者模式无法编辑帖子。")) {
    return;
  }
  postEditForm.classList.remove("hidden");
});

cancelPostBtn.addEventListener("click", () => {
  postEditForm.classList.add("hidden");
});

deletePostBtn.addEventListener("click", () => {
  if (!currentPost) {
    return;
  }
  if (guardSpectator("旁观者模式无法删除帖子。")) {
    return;
  }
  if (!confirm(`确定删除帖子 “${currentPost.title}” 吗？`)) {
    return;
  }
  state.posts = state.posts.filter((post) => post.id !== currentPost.id);
  savePosts();
  window.location.href = "index.html";
});

postEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentPost) {
    return;
  }
  if (guardSpectator("旁观者模式无法编辑帖子。")) {
    return;
  }

  const title = postEditForm.title.value.trim();
  const intro = postEditForm.intro.value.trim();
  const time = postEditForm.time.value.trim();
  const categories = parseCategories(postEditForm.categories.value);
  const removeImage = postEditForm.removeImage.checked;
  const imageFile = postEditForm.image.files[0];
  const authorType = postAuthorTypeSelect ? postAuthorTypeSelect.value : "anon";

  if (!title || !intro) {
    alert("标题和简介不能为空。");
    return;
  }

  let image = currentPost.image;
  if (removeImage) {
    image = "";
  }
  if (imageFile) {
    try {
      image = await readFileAsDataUrl(imageFile);
    } catch (error) {
      alert("配图读取失败，将保留原配图。");
    }
  }

  currentPost.title = title;
  currentPost.intro = intro;
  currentPost.time = time;
  currentPost.categories = categories;
  currentPost.image = image;

  if (authorType === "user") {
    const userId = postAuthorUserSelect ? postAuthorUserSelect.value : "";
    if (!userId) {
      alert("请选择用户作为发布身份。");
      return;
    }
    currentPost.author = { type: "user", userId };
  } else if (authorType === "official") {
    currentPost.author = { type: "official" };
  } else if (currentPost.author?.type === "anon") {
    currentPost.author = { type: "anon", anonId: currentPost.author.anonId || randomSystemId() };
  } else {
    currentPost.author = { type: "anon", anonId: randomSystemId() };
  }

  savePosts();
  postEditForm.classList.add("hidden");
  renderPost(currentPost);
});

replyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentPost) {
    return;
  }
  if (guardSpectator("旁观者模式无法回复。")) {
    return;
  }
  const textarea = replyForm.querySelector("textarea");
  const content = textarea.value.trim();
  if (!content) {
    return;
  }

  const authorType = replyAuthorTypeSelect ? replyAuthorTypeSelect.value : "anon";
  let author = { type: "anon", anonId: randomSystemId() };
  if (authorType === "user") {
    const userId = replyAuthorUserSelect ? replyAuthorUserSelect.value : "";
    if (!userId) {
      alert("请选择用户作为回复身份。");
      return;
    }
    author = { type: "user", userId };
  } else if (authorType === "official") {
    author = { type: "official" };
  }

  let image = "";
  const imageFile = replyImageInput ? replyImageInput.files[0] : null;
  if (imageFile) {
    try {
      image = await readFileAsDataUrl(imageFile);
    } catch (error) {
      alert("回复配图读取失败，将跳过配图。");
    }
  }

  const replyTargetId = replyForm.dataset.replyTargetId || "";
  const replyMode = getReplyMode();
  const replyData = {
    id: createId("reply"),
    content,
    author,
    replyTo: replyTargetId,
    image,
    createdAt: Date.now(),
    replies: [],
  };

  if (replyTargetId && replyMode === "thread") {
    const target = findReplyById(currentPost.replies, replyTargetId);
    if (target) {
      target.replies = Array.isArray(target.replies) ? target.replies : [];
      target.replies.push(replyData);
    } else {
      currentPost.replies.push(replyData);
    }
  } else {
    currentPost.replies.push(replyData);
  }
  savePosts();
  replyForm.reset();
  if (replyAuthorTypeSelect) {
    replyAuthorTypeSelect.value = "anon";
  }
  renderReplyAuthorOptions();
  clearReplyTarget();
  renderPost(currentPost);
});

replyListEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  const image = event.target.closest(".reply-image img");
  if (image && imageViewer && imageViewerImg) {
    imageViewerImg.src = image.src;
    imageViewer.classList.remove("hidden");
    return;
  }
  if (!button || !currentPost) {
    return;
  }
  const action = button.dataset.action;
  if (!action) {
    return;
  }
  if (guardSpectator("旁观者模式无法操作回复。")) {
    return;
  }

  const replyEl = button.closest(".reply");
  if (!replyEl) {
    return;
  }
  const replyId = replyEl.dataset.replyId;
  const found = findReplyWithParent(currentPost.replies, replyId);
  if (!found) {
    return;
  }
  const reply = found.reply;

  const editForm = replyEl.querySelector(".reply-edit");

  if (action === "reply") {
    setReplyTarget(replyId);
    replyForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (action === "edit-reply" && editForm) {
    editForm.classList.remove("hidden");
  }

  if (action === "cancel-reply" && editForm) {
    editForm.classList.add("hidden");
  }

  if (action === "delete-reply") {
    const preview = reply.content.length > 30 ? `${reply.content.slice(0, 30)}...` : reply.content;
    if (!confirm(`确定删除回复 “${preview}” 吗？`)) {
      return;
    }
    found.parent.splice(found.parent.indexOf(reply), 1);
    savePosts();
    renderPost(currentPost);
  }
});

if (imageViewer) {
  const closeViewer = () => {
    imageViewer.classList.add("hidden");
    if (imageViewerImg) {
      imageViewerImg.src = "";
    }
  };
  if (imageViewerClose) {
    imageViewerClose.addEventListener("click", closeViewer);
  }
  if (imageViewerBackdrop) {
    imageViewerBackdrop.addEventListener("click", closeViewer);
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeViewer();
    }
  });
}

replyListEl.addEventListener("submit", async (event) => {
  if (!event.target.matches(".reply-edit")) {
    return;
  }
  event.preventDefault();
  if (!currentPost) {
    return;
  }
  if (guardSpectator("旁观者模式无法编辑回复。")) {
    return;
  }
  const form = event.target;
  const replyId = form.dataset.replyId;
  const found = findReplyWithParent(currentPost.replies, replyId);
  if (!found) {
    return;
  }
  const reply = found.reply;
  const content = form.querySelector("textarea").value.trim();
  if (!content) {
    alert("回复内容不能为空。");
    return;
  }
  const removeImage = form.querySelector('input[name="removeImage"]')?.checked;
  const imageFile = form.querySelector('input[name="image"]')?.files[0];

  let image = reply.image || "";
  if (removeImage) {
    image = "";
  }
  if (imageFile) {
    try {
      image = await readFileAsDataUrl(imageFile);
    } catch (error) {
      alert("回复配图读取失败，将保留原配图。");
    }
  }

  reply.content = content;
  reply.image = image;
  savePosts();
  renderPost(currentPost);
});

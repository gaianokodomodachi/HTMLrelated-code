const defaultStatusOptions = ["在线", "离开"];
const uiStorageKey = "chat-sim-ui-v1";
const backupStorageKey = "chat-sim-backup-v1";

const state = {
  roles: [],
  chats: [],
  activeChatId: null,
  editingId: null,
  editingRoleId: null,
  replyTo: null,
  insertTarget: null,
  statusOptions: [...defaultStatusOptions],
};

const uiState = {
  mode: "admin",
  rolesCollapsed: false,
  chatsCollapsed: false,
  theme: "default",
  sidebarCollapsed: false,
};

const backupState = {
  auto: true,
  fileName: "",
  handle: null,
  lastBackupAt: "",
};

const bulkState = {
  active: false,
  selected: new Set(),
};

const createChatState = {
  userRoleId: null,
  targetIds: [],
};

let elements = {};
let backupTimer = null;
let backupHintTimer = null;

const setElements = () => {
  elements = {
    roleList: document.getElementById("role-list"),
    roleEmpty: document.getElementById("role-empty"),
    senderSelect: document.getElementById("sender-select"),
    messageInput: document.getElementById("message-input"),
    sendBtn: document.getElementById("send-btn"),
    messageList: document.getElementById("message-list"),
    messageEmpty: document.getElementById("message-empty"),
    statusSelect: document.getElementById("status-select"),
    statusCustom: document.getElementById("status-custom"),
    statusCustomInput: document.getElementById("status-custom-input"),
    statusCustomBtn: document.getElementById("status-custom-btn"),
    openExport: document.getElementById("open-export"),
    exportModal: document.getElementById("export-modal"),
    exportScope: document.getElementById("export-scope"),
    exportFormat: document.getElementById("export-format"),
    exportConfirm: document.getElementById("export-confirm"),
    exportHint: document.getElementById("export-hint"),
    roleModal: document.getElementById("role-modal"),
    openRoleModal: document.getElementById("open-role-modal"),
    createRole: document.getElementById("create-role"),
    roleTitle: document.getElementById("role-title"),
    roleName: document.getElementById("role-name"),
    roleAvatar: document.getElementById("role-avatar"),
    roleAvatarFile: document.getElementById("role-avatar-file"),
    avatarPreview: document.getElementById("avatar-preview"),
    avatarPlaceholder: document.getElementById("avatar-placeholder"),
    avatarPreviewText: document.getElementById("avatar-preview-text"),
    composerHint: document.getElementById("composer-hint"),
    imageInput: document.getElementById("image-input"),
    imageBtn: document.getElementById("image-btn"),
    openChatSettings: document.getElementById("open-chat-settings"),
    chatModal: document.getElementById("chat-modal"),
    chatName: document.getElementById("chat-name"),
    chatNameLabel: document.getElementById("chat-name-label"),
    chatIntro: document.getElementById("chat-intro"),
    groupMemberSection: document.getElementById("group-member-section"),
    groupMemberOptions: document.getElementById("group-member-options"),
    chatSettingsHint: document.getElementById("chat-settings-hint"),
    deleteChatBtn: document.getElementById("delete-chat"),
    saveChat: document.getElementById("save-chat"),
    chatHeaderTitle: document.getElementById("chat-header-title"),
    statusText: document.getElementById("status-text"),
    openChatCreate: document.getElementById("open-chat-create"),
    chatCreateModal: document.getElementById("chat-create-modal"),
    userRoleOptions: document.getElementById("user-role-options"),
    chatTargetOptions: document.getElementById("chat-target-options"),
    groupFields: document.getElementById("group-fields"),
    privateFields: document.getElementById("private-fields"),
    groupName: document.getElementById("group-name"),
    privateRemark: document.getElementById("private-remark"),
    chatCreateIntro: document.getElementById("chat-create-intro"),
    createChatBtn: document.getElementById("create-chat"),
    chatCreateHint: document.getElementById("chat-create-hint"),
    chatList: document.getElementById("chat-list"),
    chatEmpty: document.getElementById("chat-empty"),
    imageModal: document.getElementById("image-modal"),
    imagePreview: document.getElementById("image-preview"),
    replyPreview: document.getElementById("reply-preview"),
    replyText: document.getElementById("reply-text"),
    cancelReply: document.getElementById("cancel-reply"),
    insertPreview: document.getElementById("insert-preview"),
    insertText: document.getElementById("insert-text"),
    cancelInsert: document.getElementById("cancel-insert"),
    insertSender: document.getElementById("insert-sender"),
    insertTime: document.getElementById("insert-time"),
    composer: document.getElementById("composer"),
    roleSection: document.getElementById("role-section"),
    chatSection: document.getElementById("chat-section"),
    roleBody: document.getElementById("role-body"),
    chatBody: document.getElementById("chat-body"),
    roleToggle: document.getElementById("toggle-roles"),
    chatToggle: document.getElementById("toggle-chats"),
    modeAdmin: document.getElementById("mode-admin"),
    modeViewer: document.getElementById("mode-viewer"),
    themeSelect: document.getElementById("theme-select"),
    backupAuto: document.getElementById("backup-auto"),
    backupPick: document.getElementById("backup-pick"),
    backupNow: document.getElementById("backup-now"),
    backupDownload: document.getElementById("backup-download"),
    backupFile: document.getElementById("backup-file"),
    backupLast: document.getElementById("backup-last"),
    backupHint: document.getElementById("backup-hint"),
    bulkToggle: document.getElementById("bulk-toggle"),
    bulkBar: document.getElementById("bulk-bar"),
    bulkCount: document.getElementById("bulk-count"),
    bulkSelectAll: document.getElementById("bulk-select-all"),
    bulkInvert: document.getElementById("bulk-invert"),
    bulkDelete: document.getElementById("bulk-delete"),
    bulkCancel: document.getElementById("bulk-cancel"),
    sidebarToggle: document.getElementById("sidebar-toggle"),
    sidebarToggleInline: document.getElementById("sidebar-toggle-inline"),
  };
};

const hideJsWarning = () => {
  const warning = document.getElementById("js-warning");
  if (warning) warning.style.display = "none";
};

const messageTemplate = document.getElementById("message-template");
const editTemplate = document.getElementById("edit-template");

const storageKey = "chat-sim-data-v1";
const colors = ["#111111", "#2a2a2a", "#3a3a3a", "#1f1f1f"]; 

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isViewerMode = () => uiState.mode === "viewer";

const loadUiState = () => {
  try {
    const raw = localStorage.getItem(uiStorageKey);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && (data.mode === "admin" || data.mode === "viewer")) {
      uiState.mode = data.mode;
    }
    if (data && typeof data.rolesCollapsed === "boolean") {
      uiState.rolesCollapsed = data.rolesCollapsed;
    }
    if (data && typeof data.chatsCollapsed === "boolean") {
      uiState.chatsCollapsed = data.chatsCollapsed;
    }
    if (data && typeof data.theme === "string") {
      uiState.theme = data.theme;
    }
    if (data && typeof data.sidebarCollapsed === "boolean") {
      uiState.sidebarCollapsed = data.sidebarCollapsed;
    }
  } catch (error) {
    console.warn("读取界面配置失败", error);
  }
};

const saveUiState = () => {
  try {
    localStorage.setItem(uiStorageKey, JSON.stringify({
      mode: uiState.mode,
      rolesCollapsed: uiState.rolesCollapsed,
      chatsCollapsed: uiState.chatsCollapsed,
      theme: uiState.theme,
      sidebarCollapsed: uiState.sidebarCollapsed,
    }));
  } catch (error) {
    console.warn("保存界面配置失败", error);
  }
};

const supportsFileBackup = () => typeof window.showSaveFilePicker === "function";

const loadBackupState = () => {
  try {
    const raw = localStorage.getItem(backupStorageKey);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && typeof data.auto === "boolean") {
      backupState.auto = data.auto;
    }
    if (data && typeof data.fileName === "string") {
      backupState.fileName = data.fileName;
    }
    if (data && typeof data.lastBackupAt === "string") {
      backupState.lastBackupAt = data.lastBackupAt;
    }
  } catch (error) {
    console.warn("读取备份配置失败", error);
  }
};

const saveBackupState = () => {
  try {
    localStorage.setItem(backupStorageKey, JSON.stringify({
      auto: backupState.auto,
      fileName: backupState.fileName,
      lastBackupAt: backupState.lastBackupAt,
    }));
  } catch (error) {
    console.warn("保存备份配置失败", error);
  }
};

const setBackupHint = (text, keep = false) => {
  if (!elements.backupHint) return;
  elements.backupHint.textContent = text;
  if (backupHintTimer) {
    clearTimeout(backupHintTimer);
    backupHintTimer = null;
  }
  if (!keep) {
    backupHintTimer = setTimeout(() => {
      updateBackupUI();
    }, 2000);
  }
};

const updateBackupUI = () => {
  if (!elements.backupAuto) return;
  elements.backupAuto.checked = backupState.auto;
  const supported = supportsFileBackup();
  const viewer = isViewerMode();
  if (elements.backupAuto) elements.backupAuto.disabled = viewer || !supported;
  if (elements.backupPick) elements.backupPick.disabled = viewer || !supported;
  if (elements.backupNow) elements.backupNow.disabled = viewer || !supported;
  if (elements.backupDownload) elements.backupDownload.disabled = viewer;
  if (elements.backupFile) {
    elements.backupFile.textContent = backupState.fileName || "未选择";
  }
  if (elements.backupLast) {
    elements.backupLast.textContent = backupState.lastBackupAt
      ? formatBackupTime(backupState.lastBackupAt)
      : "暂无";
  }
  if (elements.backupHint) {
    if (!supported) {
      elements.backupHint.textContent = "当前浏览器不支持本地写入，可使用下载备份。";
    } else if (backupState.auto) {
      elements.backupHint.textContent = backupState.handle
        ? "自动备份已开启"
        : "自动备份已开启，请先选择备份文件。";
    } else {
      elements.backupHint.textContent = "自动备份已关闭";
    }
  }
};

const updateBulkBar = () => {
  if (!elements.bulkBar) return;
  elements.bulkBar.hidden = !bulkState.active;
  const chat = getActiveChat();
  const hasMessages = Boolean(chat && Array.isArray(chat.messages) && chat.messages.length);
  if (elements.bulkCount) {
    elements.bulkCount.textContent = `已选 ${bulkState.selected.size} 条`;
  }
  if (elements.bulkDelete) {
    elements.bulkDelete.disabled = bulkState.selected.size === 0;
  }
  if (elements.bulkCancel) {
    elements.bulkCancel.disabled = !bulkState.active;
  }
  if (elements.bulkSelectAll) {
    elements.bulkSelectAll.disabled = !bulkState.active || !hasMessages;
  }
  if (elements.bulkInvert) {
    elements.bulkInvert.disabled = !bulkState.active || !hasMessages;
  }
};

const setBulkMode = (active) => {
  bulkState.active = Boolean(active);
  if (!bulkState.active) {
    bulkState.selected.clear();
  } else {
    state.editingId = null;
    clearReplyTarget();
  }
  document.body.classList.toggle("bulk-mode", bulkState.active);
  updateBulkBar();
  renderMessages();
};

const toggleBulkSelection = (messageId, checked) => {
  if (!messageId) return;
  if (checked) {
    bulkState.selected.add(messageId);
  } else {
    bulkState.selected.delete(messageId);
  }
  updateBulkBar();
};

const selectAllMessages = () => {
  const chat = getActiveChat();
  if (!chat || !Array.isArray(chat.messages)) return;
  bulkState.selected.clear();
  chat.messages.forEach((message) => bulkState.selected.add(message.id));
  updateBulkBar();
  renderMessages();
};

const invertMessageSelection = () => {
  const chat = getActiveChat();
  if (!chat || !Array.isArray(chat.messages)) return;
  const current = new Set(bulkState.selected);
  bulkState.selected.clear();
  chat.messages.forEach((message) => {
    if (!current.has(message.id)) {
      bulkState.selected.add(message.id);
    }
  });
  updateBulkBar();
  renderMessages();
};

const deleteSelectedMessages = () => {
  const chat = getActiveChat();
  if (!chat) return;
  if (bulkState.selected.size === 0) return;
  if (state.insertTarget && bulkState.selected.has(state.insertTarget.id)) {
    clearInsertTarget();
  }
  chat.messages = chat.messages.filter((message) => !bulkState.selected.has(message.id));
  bulkState.selected.clear();
  saveState();
  if (!chat.messages.length) {
    setBulkMode(false);
  } else {
    updateBulkBar();
    renderMessages();
  }
  renderChatList();
};

const updateSectionToggle = (sectionEl, toggleEl, collapsed) => {
  if (!sectionEl || !toggleEl) return;
  sectionEl.classList.toggle("collapsed", collapsed);
  toggleEl.textContent = collapsed ? "展开" : "折叠";
  toggleEl.setAttribute("aria-expanded", String(!collapsed));
};

const applyUiState = () => {
  if (uiState.theme && uiState.theme !== "default") {
    document.body.setAttribute("data-theme", uiState.theme);
  } else {
    document.body.removeAttribute("data-theme");
  }
  if (elements.themeSelect) {
    elements.themeSelect.value = uiState.theme || "default";
  }
  document.body.classList.toggle("sidebar-collapsed", uiState.sidebarCollapsed);
  if (elements.sidebarToggle) {
    elements.sidebarToggle.textContent = uiState.sidebarCollapsed ? "展开侧栏" : "收起侧栏";
  }
  if (elements.sidebarToggleInline) {
    elements.sidebarToggleInline.textContent = uiState.sidebarCollapsed ? "展开侧栏" : "收起侧栏";
  }
  document.body.classList.toggle("viewer-mode", isViewerMode());
  if (elements.modeAdmin) {
    elements.modeAdmin.classList.toggle("is-active", uiState.mode === "admin");
  }
  if (elements.modeViewer) {
    elements.modeViewer.classList.toggle("is-active", uiState.mode === "viewer");
  }
  updateSectionToggle(elements.roleSection, elements.roleToggle, uiState.rolesCollapsed);
  updateSectionToggle(elements.chatSection, elements.chatToggle, uiState.chatsCollapsed);
  if (elements.openRoleModal) elements.openRoleModal.disabled = isViewerMode();
  if (elements.openChatCreate) elements.openChatCreate.disabled = isViewerMode();
  updateBackupUI();
  updateBulkBar();
};

const setMode = (mode) => {
  if (mode !== "admin" && mode !== "viewer") return;
  if (uiState.mode === mode) return;
  uiState.mode = mode;
  saveUiState();
  applyUiState();
  if (isViewerMode()) {
    state.editingId = null;
    clearReplyTarget();
    if (bulkState.active) setBulkMode(false);
    clearInsertTarget();
  }
  renderConversationHeader();
  renderMessages();
};

const setTheme = (value) => {
  const themes = [
    "default",
    "black",
    "black-red",
    "green-white",
    "blue-white",
    "pink-white",
    "pink-black",
    "pure-blue",
    "starry",
    "neon",
    "aero",
    "rainbow",
    "mint-choco",
    "strawberry-cake",
    "sunshine",
    "draft-paper",
    "cosmos",
  ];
  if (!themes.includes(value)) return;
  uiState.theme = value;
  saveUiState();
  applyUiState();
};

const toggleSidebar = () => {
  uiState.sidebarCollapsed = !uiState.sidebarCollapsed;
  saveUiState();
  applyUiState();
};

const serializeState = () => ({
  version: 1,
  roles: state.roles,
  chats: state.chats,
  activeChatId: state.activeChatId,
  statusOptions: state.statusOptions,
});

const hydrateState = (data) => {
  const hasRoles = data && Array.isArray(data.roles);
  state.roles = hasRoles ? data.roles : [];
  state.chats = [];
  state.activeChatId = null;
  const statusOptions = data && Array.isArray(data.statusOptions) ? data.statusOptions : [];
  state.statusOptions = statusOptions.length ? statusOptions : [...defaultStatusOptions];

  if (data && Array.isArray(data.chats)) {
    state.chats = data.chats;
    const firstChatId = state.chats[0] ? state.chats[0].id : null;
    state.activeChatId = data.activeChatId || firstChatId || null;
  } else if (data && (Array.isArray(data.messages) || data.chat)) {
    const userRoleId = state.roles[0] ? state.roles[0].id : null;
    const participantIds = state.roles.slice(1).map((role) => role.id);
    const legacyTitle = data.chat && data.chat.title ? data.chat.title : "";

    const isGroup = participantIds.length > 1;
    const chat = {
      id: createId(),
      userRoleId,
      participantIds,
      memberIds: [userRoleId, ...participantIds].filter(Boolean),
      isGroup,
      groupName: isGroup ? legacyTitle : "",
      remark: !isGroup && legacyTitle !== "CHATS" ? legacyTitle : "",
      intro: data.chat && data.chat.intro ? data.chat.intro : "开始聊天吧！",
      status: data.chat && data.chat.status ? data.chat.status : "在线",
      messages: Array.isArray(data.messages) ? data.messages : [],
    };

    if (data.chat && Array.isArray(data.chat.statusOptions) && data.chat.statusOptions.length) {
      state.statusOptions = data.chat.statusOptions;
    }

    state.chats = [chat];
    state.activeChatId = chat.id;
  }

  state.chats.forEach((chat) => {
    if (!chat.userRoleId && state.roles[0]) {
      chat.userRoleId = state.roles[0].id;
    }
    chat.participantIds = Array.isArray(chat.participantIds) ? chat.participantIds : [];
    chat.isGroup = Boolean(
      typeof chat.isGroup === "boolean" ? chat.isGroup : (chat.participantIds.length > 1)
    );
    if (!Array.isArray(chat.memberIds) || chat.memberIds.length === 0) {
      chat.memberIds = [chat.userRoleId, ...chat.participantIds].filter(Boolean);
    }
    chat.localRoles = Array.isArray(chat.localRoles) ? chat.localRoles : [];
    chat.memberIds = Array.from(new Set(chat.memberIds.filter(Boolean)));
    chat.memberIds = chat.memberIds.filter(
      (id) => getRoleById(id) || chat.localRoles.find((role) => role.id === id)
    );
    chat.localRoles = chat.localRoles.filter((role) => !getRoleById(role.id));
    chat.localRoles = chat.localRoles.map((role, index) => ({
      id: role.id || createId(),
        name: role.name || "未知联系人",
      avatarUrl: role.avatarUrl || "",
      color: role.color || colors[(state.roles.length + index) % colors.length],
    }));
    if (chat.userRoleId) {
      chat.participantIds = chat.participantIds.filter((id) => id !== chat.userRoleId);
    }
    chat.participantIds = chat.participantIds.filter((id) => chat.memberIds.includes(id));
    chat.messages = Array.isArray(chat.messages) ? chat.messages : [];
    chat.status = chat.status || "在线";
    chat.intro = chat.intro || "开始聊天吧！";
    chat.groupName = chat.groupName || "";
    chat.remark = chat.remark || "";

    chat.messages.forEach((message) => {
      if (!message.type) message.type = "text";
      if (typeof message.read !== "boolean") message.read = false;
      if (typeof message.timestamp !== "number") message.timestamp = Date.now();
      message.sortTime = typeof message.sortTime === "number"
        ? message.sortTime
        : parseTimeSortValue(message.timeText || "", message.timestamp);
    });
  });

  if (state.activeChatId && !getChatById(state.activeChatId)) {
    state.activeChatId = state.chats[0] ? state.chats[0].id : null;
  }
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const data = JSON.parse(raw);
    hydrateState(data);
  } catch (error) {
    console.warn("加载本地数据失败", error);
  }
};

const saveState = () => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(serializeState()));
    requestAutoBackup();
  } catch (error) {
    console.warn("保存本地数据失败", error);
  }
};

const formatTime = (timestamp = Date.now()) => {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const parseTimeSortValue = (value, baseTimestamp) => {
  if (!value) return baseTimestamp;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  const match = value.trim().match(/^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?$/);
  if (match) {
    const hours = Math.min(23, Math.max(0, Number(match[1])));
    const minutes = Math.min(59, Math.max(0, Number(match[2] || 0)));
    const seconds = Math.min(59, Math.max(0, Number(match[3] || 0)));
    const base = new Date(baseTimestamp || Date.now());
    base.setHours(hours, minutes, seconds, 0);
    return base.getTime();
  }
  return baseTimestamp;
};

const getMessageSortTime = (message) => {
  if (!message) return 0;
  if (typeof message.sortTime === "number") return message.sortTime;
  if (typeof message.timestamp === "number") return message.timestamp;
  return 0;
};

const getSortedMessages = (chat) => {
  if (!chat || !Array.isArray(chat.messages)) return [];
  return [...chat.messages].sort((a, b) => {
    const diff = getMessageSortTime(a) - getMessageSortTime(b);
    if (diff !== 0) return diff;
    const aTime = typeof a.timestamp === "number" ? a.timestamp : 0;
    const bTime = typeof b.timestamp === "number" ? b.timestamp : 0;
    return aTime - bTime;
  });
};

const isNearBottom = () => {
  const list = elements.messageList;
  if (!list) return true;
  return list.scrollTop + list.clientHeight >= list.scrollHeight - 20;
};

const adjustMessageScroll = (shouldStickToBottom, forceTop = false) => {
  const list = elements.messageList;
  if (!list) return;
  requestAnimationFrame(() => {
    const fits = list.scrollHeight <= list.clientHeight + 1;
    if (forceTop || fits) {
      list.scrollTop = 0;
      return;
    }
    if (shouldStickToBottom) {
      list.scrollTop = list.scrollHeight;
    }
  });
};

const populateEditSenderSelect = (select, chat, message) => {
  if (!select || !chat) return;
  select.innerHTML = "";
  const systemOption = document.createElement("option");
  systemOption.value = "__system__";
  systemOption.textContent = "系统消息";
  select.appendChild(systemOption);

  const participants = getChatParticipants(chat);
  participants.forEach((role) => {
    const option = document.createElement("option");
    option.value = role.id;
    option.textContent = role.name;
    select.appendChild(option);
  });

  if (message && message.type === "system") {
    select.value = "__system__";
  } else if (message && message.senderId) {
    select.value = message.senderId;
  } else if (participants[0]) {
    select.value = participants[0].id;
  } else {
    select.value = "__system__";
  }
};

const getInsertContext = () => {
  if (!state.insertTarget) return null;
  const chat = getActiveChat();
  if (!chat) return null;
  const target = chat.messages.find((message) => message.id === state.insertTarget.id);
  if (!target) return null;
  return {
    target,
    position: state.insertTarget.position,
    reply: Boolean(state.insertTarget.reply),
  };
};

const populateInsertSenderOptions = () => {
  if (!elements.insertSender) return;
  const chat = getActiveChat();
  if (!chat) return;
  const participants = getChatParticipants(chat);
  elements.insertSender.innerHTML = "";
  participants.forEach((role) => {
    const option = document.createElement("option");
    option.value = role.id;
    option.textContent = role.name;
    elements.insertSender.appendChild(option);
  });
  const fallback = elements.senderSelect ? elements.senderSelect.value : "";
  if (fallback && participants.find((role) => role.id === fallback)) {
    elements.insertSender.value = fallback;
  } else if (participants[0]) {
    elements.insertSender.value = participants[0].id;
  }
};

const updateInsertPreview = () => {
  if (!elements.insertPreview || !elements.insertText) return;
  const chat = getActiveChat();
  const context = getInsertContext();
  if (!context || !chat) {
    elements.insertPreview.hidden = true;
    elements.insertText.textContent = "";
    return;
  }
  const previewSource = getMessagePreviewText(context.target);
  const snippet = `${previewSource.slice(0, 5)}……`;
  const positionLabel = context.position === "above" ? "上方" : "下方";
  const typeLabel = context.reply ? "插入回复" : "插入消息";
  elements.insertText.textContent = `${typeLabel}：${positionLabel} ${snippet}`;
  elements.insertPreview.hidden = false;
};

const clearInsertTarget = () => {
  state.insertTarget = null;
  if (elements.insertTime) elements.insertTime.value = "";
  updateInsertPreview();
};

const setInsertTarget = (message, position, withReply = false) => {
  if (!message) return;
  state.insertTarget = {
    id: message.id,
    position,
    reply: Boolean(withReply),
  };
  populateInsertSenderOptions();
  if (elements.insertTime) elements.insertTime.value = "";
  if (withReply) {
    setReplyTarget(message);
  } else {
    clearReplyTarget();
  }
  updateInsertPreview();
};

const getInsertOverrides = () => {
  if (!state.insertTarget) return null;
  const senderId = elements.insertSender ? elements.insertSender.value : "";
  const timeText = elements.insertTime ? elements.insertTime.value.trim() : "";
  return {
    senderId,
    timeText,
  };
};

const getMessagePreviewText = (message) => {
  if (!message) return "消息";
  if (message.status === "recalled") return "对方已撤回";
  if (message.type === "image") return "图片";
  if (message.type === "system") return message.text || "系统消息";
  return message.text || "消息";
};

const escapeHtml = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const escapePdfString = (text) =>
  text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const sanitizeFilename = (name) => name.replace(/[\\\\/:*?\"<>|]/g, "_").trim() || "chat-export";

const buildBackupPayload = () => JSON.stringify(serializeState(), null, 2);

const formatBackupTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
};

const markBackupSuccess = () => {
  backupState.lastBackupAt = new Date().toISOString();
  saveBackupState();
  updateBackupUI();
};

const chooseBackupFile = async () => {
  if (!supportsFileBackup()) return null;
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: backupState.fileName || "chat-backup.json",
      types: [
        {
          description: "JSON 文件",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    backupState.handle = handle;
    backupState.fileName = handle.name || backupState.fileName;
    saveBackupState();
    updateBackupUI();
    return handle;
  } catch (error) {
    if (error && error.name === "AbortError") return null;
    console.warn("选择备份文件失败", error);
    setBackupHint("选择备份文件失败，请重试。");
    return null;
  }
};

const writeBackupToHandle = async () => {
  if (!backupState.handle) return false;
  try {
    const writable = await backupState.handle.createWritable();
    await writable.write(buildBackupPayload());
    await writable.close();
    backupState.fileName = backupState.handle.name || backupState.fileName;
    saveBackupState();
    setBackupHint("备份已完成");
    markBackupSuccess();
    return true;
  } catch (error) {
    console.warn("写入备份失败", error);
    if (error && error.name === "NotAllowedError") {
      backupState.handle = null;
    }
    setBackupHint("备份失败，可点击下载备份。", true);
    return false;
  }
};

const downloadBackupFile = () => {
  const payload = buildBackupPayload();
  const baseName = backupState.fileName || "chat-backup.json";
  const safeName = sanitizeFilename(baseName.endsWith(".json") ? baseName : `${baseName}.json`);
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  backupState.fileName = safeName;
  saveBackupState();
  setBackupHint("备份已下载");
  markBackupSuccess();
};

const requestAutoBackup = () => {
  if (!backupState.auto || !supportsFileBackup()) return;
  if (!backupState.handle) {
    updateBackupUI();
    return;
  }
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(() => {
    writeBackupToHandle();
  }, 500);
};

const getInitials = (name) => name.trim().slice(0, 2).toUpperCase();

const getRoleById = (id) => state.roles.find((role) => role.id === id);

const getRoleByIdInChat = (chat, id) => {
  if (!chat) return getRoleById(id);
  return getRoleById(id) || (chat.localRoles || []).find((role) => role.id === id);
};

const isLocalRole = (chat, roleId) => {
  if (!chat || !Array.isArray(chat.localRoles)) return false;
  return Boolean(chat.localRoles.find((role) => role.id === roleId));
};

const getAllRolesForChat = (chat) => {
  const map = new Map();
  state.roles.forEach((role) => map.set(role.id, role));
  if (chat && Array.isArray(chat.localRoles)) {
    chat.localRoles.forEach((role) => {
      if (!map.has(role.id)) map.set(role.id, role);
    });
  }
  return Array.from(map.values());
};

const getChatById = (id) => state.chats.find((chat) => chat.id === id);

const getActiveChat = () => getChatById(state.activeChatId);

const isGroupChat = (chat) => Boolean(chat && chat.isGroup);

const getChatDisplayName = (chat) => {
  if (!chat) return "请选择对话";
  if (isGroupChat(chat)) {
    const name = chat.groupName ? chat.groupName.trim() : "";
    return name || "群聊";
  }
  const otherRole = getChatTargets(chat)[0];
  const remark = chat && chat.remark ? chat.remark.trim() : "";
  const otherName = otherRole ? otherRole.name : "";
  return remark || otherName || "私聊";
};

const getChatIntro = (chat) => {
  const intro = chat && chat.intro ? chat.intro.trim() : "";
  return intro ? chat.intro : "开始聊天吧！";
};

const getChatParticipants = (chat) => {
  if (!chat) return [];
  const ids = Array.isArray(chat.memberIds)
    ? chat.memberIds
    : [chat.userRoleId, ...(chat.participantIds || [])].filter(Boolean);
  const uniqueIds = Array.from(new Set(ids));
  return uniqueIds.map((id) => getRoleByIdInChat(chat, id)).filter(Boolean);
};

const getChatTargets = (chat) => {
  if (!chat) return [];
  const memberIds = Array.isArray(chat.memberIds)
    ? chat.memberIds
    : [chat.userRoleId, ...(chat.participantIds || [])].filter(Boolean);
  const targetIds = memberIds.filter((id) => id !== chat.userRoleId);
  return targetIds.map((id) => getRoleByIdInChat(chat, id)).filter(Boolean);
};

const renderRoles = () => {
  elements.roleList.innerHTML = "";
  if (state.roles.length === 0) {
    elements.roleEmpty.style.display = "block";
  } else {
    elements.roleEmpty.style.display = "none";
  }

  state.roles.forEach((role) => {
    const card = document.createElement("div");
    card.className = "role-card";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.style.background = role.color;

    if (role.avatarUrl) {
      const img = document.createElement("img");
      img.src = role.avatarUrl;
      img.alt = role.name;
      avatar.appendChild(img);
    } else {
      avatar.textContent = getInitials(role.name);
    }

    const meta = document.createElement("div");
    meta.className = "role-meta";
    const name = document.createElement("div");
    name.className = "role-name";
    name.textContent = role.name;
    const sub = document.createElement("div");
    sub.className = "role-sub";
    sub.textContent = role.avatarUrl ? "自定义头像" : "默认头像";

    meta.appendChild(name);
    meta.appendChild(sub);

    const actions = document.createElement("div");
    actions.className = "role-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "role-edit";
    editBtn.type = "button";
    editBtn.textContent = "编辑";
    editBtn.disabled = isViewerMode();
    editBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openRoleEdit(role.id);
    });
    actions.appendChild(editBtn);

    card.appendChild(avatar);
    card.appendChild(meta);
    card.appendChild(actions);

    if (!isViewerMode()) {
      card.addEventListener("dblclick", () => openRoleEdit(role.id));
    }

    elements.roleList.appendChild(card);
  });

  elements.openChatCreate.disabled = isViewerMode();
  renderChatCreateOptions();
  renderChatList();
  renderConversationHeader();
};

const renderSenderOptions = () => {
  elements.senderSelect.innerHTML = "";
  const chat = getActiveChat();
  if (!chat) return;

  const participants = getChatParticipants(chat);
  participants.forEach((role) => {
    const option = document.createElement("option");
    option.value = role.id;
    option.textContent = role.name;
    elements.senderSelect.appendChild(option);
  });

  if (chat.userRoleId && Array.isArray(chat.memberIds) && chat.memberIds.includes(chat.userRoleId)) {
    elements.senderSelect.value = chat.userRoleId;
  } else if (participants[0]) {
    elements.senderSelect.value = participants[0].id;
  }
};

const renderConversationHeader = () => {
  const chat = getActiveChat();
  elements.chatHeaderTitle.textContent = getChatDisplayName(chat);
  if (elements.statusText) {
    elements.statusText.textContent = chat ? (chat.status || "") : "";
  }

  if (chat) {
    document.querySelector(".status-dot").style.background = "#16a34a";
  } else {
    document.querySelector(".status-dot").style.background = "#999";
  }

  elements.openChatSettings.disabled = !chat || isViewerMode();
  elements.openExport.disabled = state.chats.length === 0;
  if (elements.bulkToggle) {
    elements.bulkToggle.disabled = !chat || isViewerMode() || chat.messages.length === 0;
  }

  const canChat = Boolean(chat) && Array.isArray(chat.memberIds) && chat.memberIds.length >= 1;
  const viewer = isViewerMode();
  elements.sendBtn.disabled = !canChat || viewer;
  elements.messageInput.disabled = !canChat || viewer;
  elements.senderSelect.disabled = !canChat || viewer;
  elements.imageBtn.disabled = !canChat || viewer;
  if (elements.composer) {
    elements.composer.style.display = viewer ? "none" : "block";
  }
  if (canChat) {
    elements.composerHint.style.display = "none";
  } else {
    elements.composerHint.style.display = "block";
    if (state.roles.length < 2) {
      elements.composerHint.textContent = "请先创建至少两个联系人。";
    } else if (!chat) {
      elements.composerHint.textContent = "请先创建对话。";
    } else {
      elements.composerHint.textContent = "当前对话暂无成员。";
    }
  }

  renderSenderOptions();
  renderStatusOptions();
};

const renderChatList = () => {
  elements.chatList.innerHTML = "";
  if (!state.activeChatId && state.chats.length) {
    state.activeChatId = state.chats[0].id;
  }
  if (state.chats.length === 0) {
    elements.chatEmpty.style.display = "block";
  } else {
    elements.chatEmpty.style.display = "none";
  }

  state.chats.forEach((chat) => {
    const entry = document.createElement("div");
    entry.className = "chat-entry";
    if (chat.id === state.activeChatId) entry.classList.add("active");
    entry.dataset.id = chat.id;

    const avatars = document.createElement("div");
    avatars.className = "chat-avatars";
    const targets = getChatTargets(chat).slice(0, 2);

    targets.forEach((role) => {
      const avatar = document.createElement("div");
      avatar.className = "mini-avatar";
      avatar.style.background = role.color;
      if (role.avatarUrl) {
        const img = document.createElement("img");
        img.src = role.avatarUrl;
        img.alt = role.name;
        avatar.appendChild(img);
      } else {
        avatar.textContent = getInitials(role.name);
      }
      avatars.appendChild(avatar);
    });

    if (targets.length === 0) {
      const avatar = document.createElement("div");
      avatar.className = "mini-avatar";
      avatar.textContent = "?";
      avatars.appendChild(avatar);
    }

    const meta = document.createElement("div");
    meta.className = "chat-meta";
    const title = document.createElement("div");
    title.className = "chat-title";
    title.textContent = getChatDisplayName(chat);
    const preview = document.createElement("div");
    preview.className = "chat-preview";

    if (!chat.messages.length) {
      preview.textContent = getChatIntro(chat);
    } else {
      const sortedMessages = getSortedMessages(chat);
      const latest = sortedMessages[sortedMessages.length - 1];
      if (latest.status === "recalled") {
        preview.textContent = "对方已撤回";
      } else if (latest.type === "image") {
        preview.textContent = "图片";
      } else {
        preview.textContent = latest.text;
      }
    }

    meta.appendChild(title);
    meta.appendChild(preview);

    const time = document.createElement("div");
    time.className = "chat-time";
    if (!chat.messages.length) {
      time.textContent = "--:--";
    } else {
      const sortedMessages = getSortedMessages(chat);
      const latest = sortedMessages[sortedMessages.length - 1];
      time.textContent = latest.timeText || formatTime(latest.timestamp);
    }

    entry.appendChild(avatars);
    entry.appendChild(meta);
    entry.appendChild(time);

    entry.addEventListener("click", () => {
      state.activeChatId = chat.id;
      state.editingId = null;
      clearReplyTarget();
      clearInsertTarget();
      const wasBulk = bulkState.active;
      if (wasBulk) {
        setBulkMode(false);
      }
      renderChatList();
      renderConversationHeader();
      if (!wasBulk) renderMessages();
    });

    elements.chatList.appendChild(entry);
  });
};

const renderMessages = () => {
  const stickToBottom = isNearBottom();
  elements.messageList.innerHTML = "";
  const chat = getActiveChat();
  const emptyTitle = elements.messageEmpty.querySelector(".message-empty-title");
  const emptySub = elements.messageEmpty.querySelector(".message-empty-sub");

  if (!chat) {
    emptyTitle.textContent = "请选择或创建对话";
    emptySub.textContent = "创建对话后即可开始聊天。";
    elements.messageList.appendChild(elements.messageEmpty);
    adjustMessageScroll(stickToBottom, true);
    return;
  }

  if (!chat.messages.length) {
    emptyTitle.textContent = "暂无消息";
    emptySub.textContent = "开始聊天吧！";
    elements.messageList.appendChild(elements.messageEmpty);
    adjustMessageScroll(stickToBottom, true);
    return;
  }

  const sortedMessages = getSortedMessages(chat);
  const forceTop = sortedMessages.length <= 6;
  sortedMessages.forEach((message, index) => {
    const isSystem = message.type === "system";
    const role = isSystem ? null : getRoleByIdInChat(chat, message.senderId);
    if (!role && !isSystem) return;

    const node = messageTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = message.id;

    if (isSystem) {
      node.classList.add("system");
    } else if (chat.userRoleId && message.senderId === chat.userRoleId) {
      node.classList.add("from-secondary");
    } else if (!chat.userRoleId && index % 2 === 1) {
      node.classList.add("from-secondary");
    }
    if (message.status === "recalled") node.classList.add("recalled");

    const avatar = node.querySelector(".avatar");
    if (isSystem) {
      avatar.style.background = "#333";
      avatar.textContent = "系";
      node.querySelector(".sender").textContent = "系统";
    } else {
      avatar.style.background = role.color;
      if (role.avatarUrl) {
        const img = document.createElement("img");
        img.src = role.avatarUrl;
        img.alt = role.name;
        avatar.appendChild(img);
      } else {
        avatar.textContent = getInitials(role.name);
      }
      const senderEl = node.querySelector(".sender");
      senderEl.textContent = role.name;
      if (isLocalRole(chat, role.id)) {
        const tag = document.createElement("span");
        tag.className = "role-tag";
        tag.textContent = "本地联系人";
        senderEl.insertAdjacentElement("afterend", tag);
      }
    }
    node.querySelector(".time").textContent = message.timeText || formatTime(message.timestamp);
    const selectBox = node.querySelector(".message-checkbox");
    if (selectBox) {
      selectBox.checked = bulkState.selected.has(message.id);
    }
    if (bulkState.active && bulkState.selected.has(message.id)) {
      node.classList.add("is-selected");
    }
    const readToggle = node.querySelector(".read-toggle");
    const readStatus = node.querySelector(".read-status");
    if (message.read) {
      readToggle.textContent = "已读";
      readToggle.classList.add("is-read");
      if (readStatus) readStatus.textContent = "已读";
    } else {
      readToggle.textContent = "未读";
      readToggle.classList.remove("is-read");
      if (readStatus) readStatus.textContent = "未读";
    }
    if (readStatus) readStatus.hidden = !isViewerMode();
    if (readToggle) readToggle.hidden = isViewerMode();

    const content = node.querySelector(".message-content");
    const actions = node.querySelector(".message-actions");
    if (actions) actions.style.display = isViewerMode() ? "none" : "";
    const replySnippet = node.querySelector(".reply-snippet");

    if (message.replyPreview) {
      replySnippet.textContent = `回复：${message.replyPreview}`;
      replySnippet.hidden = false;
      replySnippet.dataset.replyId = message.replyToId || "";
    } else {
      replySnippet.hidden = true;
      replySnippet.dataset.replyId = "";
    }

    if (message.status === "recalled") {
      content.textContent = "对方已撤回";
      actions.querySelector('[data-action="edit"]').disabled = true;
      actions.querySelector('[data-action="recall"]').disabled = true;
    } else if (state.editingId === message.id) {
      const editNode = editTemplate.content.firstElementChild.cloneNode(true);
      const textarea = editNode.querySelector("textarea");
      textarea.value = message.text;
      const timeInput = editNode.querySelector(".edit-time-input");
      if (timeInput) {
        timeInput.value = message.timeText || formatTime(message.timestamp);
      }
      const senderSelect = editNode.querySelector(".edit-sender-input");
      if (senderSelect) {
        populateEditSenderSelect(senderSelect, chat, message);
      }
      content.replaceWith(editNode);
      actions.style.display = "none";
    } else if (message.type === "image") {
      const image = document.createElement("img");
      image.src = message.imageUrl;
      image.alt = message.text || "图片消息";
      image.className = "message-image";
      content.replaceWith(image);
    } else if (message.type === "system") {
      content.textContent = message.text;
      actions.querySelector('[data-action="recall"]').disabled = true;
    } else {
      content.textContent = message.text;
    }

    elements.messageList.appendChild(node);
  });

  const messageEmpty = document.getElementById("message-empty");
  if (messageEmpty) messageEmpty.remove();
  adjustMessageScroll(stickToBottom, forceTop);
};

const addMessage = (text) => {
  const chat = getActiveChat();
  if (!chat) return;
  const insertOverrides = getInsertOverrides();
  const senderId = insertOverrides && insertOverrides.senderId
    ? insertOverrides.senderId
    : elements.senderSelect.value;
  if (!senderId) return;
  if (!Array.isArray(chat.memberIds) || !chat.memberIds.includes(senderId)) return;

  const now = Date.now();
  const insertContext = getInsertContext();
  const replyData = insertContext && !insertContext.reply ? null : state.replyTo;
  let sortTime = now;
  let timeText = "";
  if (insertOverrides && insertOverrides.timeText) {
    timeText = insertOverrides.timeText;
  }
  if (insertContext) {
    const base = getMessageSortTime(insertContext.target) || now;
    if (timeText) {
      const parsed = parseTimeSortValue(timeText, insertContext.target.timestamp || now);
      sortTime = parsed + (insertContext.position === "above" ? -1 : 1);
    } else {
      sortTime = base + (insertContext.position === "above" ? -1 : 1);
    }
  } else if (timeText) {
    sortTime = parseTimeSortValue(timeText, now);
  }
  chat.messages.push({
    id: createId(),
    senderId,
    text,
    type: "text",
    status: "normal",
    read: false,
    replyToId: replyData ? replyData.id : null,
    replyPreview: replyData ? replyData.preview : "",
    timestamp: now,
    sortTime,
    ...(timeText ? { timeText } : {}),
  });

  saveState();
  renderMessages();
  renderChatList();
  elements.messageInput.value = "";
  clearReplyTarget();
  clearInsertTarget();
};

const addImageMessage = (imageUrl, altText) => {
  const chat = getActiveChat();
  if (!chat) return;
  const insertOverrides = getInsertOverrides();
  const senderId = insertOverrides && insertOverrides.senderId
    ? insertOverrides.senderId
    : elements.senderSelect.value;
  if (!senderId) return;
  if (!Array.isArray(chat.memberIds) || !chat.memberIds.includes(senderId)) return;

  const now = Date.now();
  const insertContext = getInsertContext();
  const replyData = insertContext && !insertContext.reply ? null : state.replyTo;
  let sortTime = now;
  let timeText = "";
  if (insertOverrides && insertOverrides.timeText) {
    timeText = insertOverrides.timeText;
  }
  if (insertContext) {
    const base = getMessageSortTime(insertContext.target) || now;
    if (timeText) {
      const parsed = parseTimeSortValue(timeText, insertContext.target.timestamp || now);
      sortTime = parsed + (insertContext.position === "above" ? -1 : 1);
    } else {
      sortTime = base + (insertContext.position === "above" ? -1 : 1);
    }
  } else if (timeText) {
    sortTime = parseTimeSortValue(timeText, now);
  }
  chat.messages.push({
    id: createId(),
    senderId,
    text: altText || "图片",
    type: "image",
    imageUrl,
    status: "normal",
    read: false,
    replyToId: replyData ? replyData.id : null,
    replyPreview: replyData ? replyData.preview : "",
    timestamp: now,
    sortTime,
    ...(timeText ? { timeText } : {}),
  });

  saveState();
  renderMessages();
  renderChatList();
  clearReplyTarget();
  clearInsertTarget();
};

const addSystemMessage = (chat, text) => {
  if (!chat || !text) return;
  const now = Date.now();
  chat.messages.push({
    id: createId(),
    senderId: null,
    text,
    type: "system",
    status: "normal",
    read: false,
    timestamp: now,
    sortTime: now,
  });
};

const setReplyTarget = (message) => {
  if (!message) return;
  const previewSource = getMessagePreviewText(message);
  const preview = `${previewSource.slice(0, 5)}……`;
  state.replyTo = {
    id: message.id,
    preview,
  };
  elements.replyText.textContent = `回复：${preview}`;
  elements.replyPreview.hidden = false;
};

const clearReplyTarget = () => {
  state.replyTo = null;
  elements.replyText.textContent = "";
  elements.replyPreview.hidden = true;
  if (state.insertTarget && state.insertTarget.reply) {
    clearInsertTarget();
  }
};

const scrollToMessage = (messageId) => {
  if (!messageId) return;
  let target = elements.messageList.querySelector(`.message[data-id="${messageId}"]`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("highlight");
  setTimeout(() => target.classList.remove("highlight"), 1200);
};

const buildExportText = (chats) => {
  const lines = [];
  chats.forEach((chat, index) => {
    if (!chat) return;
    if (index > 0) lines.push("");
    lines.push(`对话：${getChatDisplayName(chat)}`);
    const members = getChatParticipants(chat).map((role) => role.name).join("、");
    lines.push(`成员：${members || "无"}`);
    lines.push(`简介：${getChatIntro(chat)}`);
    lines.push(`状态：${chat.status || "未知"}`);
    lines.push("----");
    const sortedMessages = getSortedMessages(chat);
    sortedMessages.forEach((message) => {
      const time = message.timeText || formatTime(message.timestamp);
      const read = message.read ? "已读" : "未读";
      const sender = message.type === "system"
        ? "系统"
        : (getRoleByIdInChat(chat, message.senderId)
            ? getRoleByIdInChat(chat, message.senderId).name
            : "未知");
      let content = "";
      if (message.status === "recalled") {
        content = "对方已撤回";
      } else if (message.type === "image") {
        content = `图片 ${message.text || ""}`.trim();
      } else {
        content = message.text || "";
      }
      const replyInfo = message.replyPreview ? `（回复：${message.replyPreview}）` : "";
      lines.push(`[${time}][${read}] ${sender}: ${content}${replyInfo}`);
    });
  });
  return lines.join("\n");
};

const buildExportJson = (chats) => ({
  exportedAt: new Date().toISOString(),
  chats: chats
    .filter(Boolean)
    .map((chat) => ({
      id: chat.id,
      name: getChatDisplayName(chat),
      isGroup: isGroupChat(chat),
      intro: getChatIntro(chat),
      status: chat.status,
      members: getChatParticipants(chat).map((role) => ({
        id: role.id,
        name: role.name,
      })),
      messages: getSortedMessages(chat).map((message) => ({
        id: message.id,
        type: message.type,
        text: message.text || "",
        time: message.timeText || formatTime(message.timestamp),
        timestamp: message.timestamp,
        read: Boolean(message.read),
        status: message.status,
        senderId: message.senderId,
        replyToId: message.replyToId || null,
        replyPreview: message.replyPreview || "",
        imageUrl: message.imageUrl || "",
      })),
    })),
});

const downloadBlob = (content, filename, mime) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};


const exportChats = () => {
  const scope = elements.exportScope.value;
  const format = elements.exportFormat.value;
  const chats = scope === "all" ? state.chats : [getActiveChat()];
  const validChats = chats.filter(Boolean);
  if (!validChats.length) return;

  const baseName = scope === "all" ? "全部对话" : getChatDisplayName(validChats[0]);
  const filename = sanitizeFilename(baseName);
  const text = buildExportText(validChats);

  if (format === "txt") {
    downloadBlob(text, `${filename}.txt`, "text/plain;charset=utf-8");
    return;
  }

  if (format === "json") {
    const json = JSON.stringify(buildExportJson(validChats), null, 2);
    downloadBlob(json, `${filename}.json`, "application/json;charset=utf-8");
    return;
  }

  if (format === "word") {
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
    downloadBlob(html, `${filename}.doc`, "application/msword");
    return;
  }

  if (format === "pdf") return;
};

const handleSend = () => {
  if (isViewerMode()) return;
  const text = elements.messageInput.value.trim();
  if (!text) return;
  const chat = getActiveChat();
  if (!chat || !Array.isArray(chat.memberIds) || chat.memberIds.length < 1) return;
  addMessage(text);
};

const openModal = () => {
  if (isViewerMode()) return;
  state.editingRoleId = null;
  if (elements.roleTitle) elements.roleTitle.textContent = "创建联系人";
  if (elements.createRole) elements.createRole.textContent = "保存联系人";
  elements.roleModal.classList.add("show");
  elements.roleModal.setAttribute("aria-hidden", "false");
  elements.roleName.focus();
};

const closeModal = () => {
  elements.roleModal.classList.remove("show");
  elements.roleModal.setAttribute("aria-hidden", "true");
  elements.roleName.value = "";
  elements.roleAvatar.value = "";
  elements.roleAvatarFile.value = "";
  delete elements.roleAvatar.dataset.upload;
  state.editingRoleId = null;
  if (elements.roleTitle) elements.roleTitle.textContent = "创建联系人";
  if (elements.createRole) elements.createRole.textContent = "保存联系人";
  updateAvatarPreview();
};

const updateAvatarPreview = (overrideUrl) => {
  const url = typeof overrideUrl !== "undefined" && overrideUrl !== null
    ? overrideUrl
    : elements.roleAvatar.value.trim();
  const name = elements.roleName.value.trim();
  const preview = elements.avatarPreview;
  const previewText = elements.avatarPreviewText;
  const existingImg = preview.querySelector("img");

  if (url) {
    if (existingImg) existingImg.remove();
    if (elements.avatarPlaceholder.parentElement) elements.avatarPlaceholder.remove();

    const img = document.createElement("img");
    img.src = url;
    img.alt = name || "头像";
    img.onerror = () => {
      img.remove();
      if (!elements.avatarPlaceholder.parentElement) {
        preview.insertBefore(elements.avatarPlaceholder, previewText);
      }
      previewText.textContent = "头像加载失败，将使用默认头像";
    };
    preview.insertBefore(img, previewText);
    previewText.textContent = "预览头像";
  } else {
    if (existingImg) existingImg.remove();
    if (!elements.avatarPlaceholder.parentElement) {
      preview.insertBefore(elements.avatarPlaceholder, previewText);
    }
    previewText.textContent = "未设置头像";
  }
};

const handleAvatarFile = () => {
  const file = elements.roleAvatarFile.files[0];
  if (!file) {
    updateAvatarPreview();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    elements.roleAvatar.dataset.upload = reader.result;
    updateAvatarPreview(reader.result);
  };
  reader.readAsDataURL(file);
};

const openRoleEdit = (roleId) => {
  if (isViewerMode()) return;
  const role = getRoleById(roleId);
  if (!role) return;
  state.editingRoleId = role.id;
  if (elements.roleTitle) elements.roleTitle.textContent = "编辑联系人";
  if (elements.createRole) elements.createRole.textContent = "保存修改";
  elements.roleName.value = role.name || "";
  elements.roleAvatar.value = role.avatarUrl || "";
  elements.roleAvatarFile.value = "";
  delete elements.roleAvatar.dataset.upload;
  updateAvatarPreview(role.avatarUrl || "");
  elements.roleModal.classList.add("show");
  elements.roleModal.setAttribute("aria-hidden", "false");
  elements.roleName.focus();
};

const createRole = () => {
  if (isViewerMode()) return;
  const name = elements.roleName.value.trim();
  const avatarUrl = elements.roleAvatar.value.trim();
  const uploadedAvatar = elements.roleAvatar.dataset.upload || "";
  if (!name) {
    elements.roleName.focus();
    return;
  }

  if (state.editingRoleId) {
    const role = getRoleById(state.editingRoleId);
    if (!role) return;
    role.name = name;
    role.avatarUrl = uploadedAvatar || avatarUrl || "";
  } else {
    state.roles.push({
      id: createId(),
      name,
      avatarUrl: uploadedAvatar || avatarUrl,
      color: colors[state.roles.length % colors.length],
    });
  }

  saveState();
  renderRoles();
  closeModal();
};

const handleMessageAction = (event) => {
  if (isViewerMode()) return;
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const messageNode = event.target.closest(".message");
  if (!messageNode) return;

  const chat = getActiveChat();
  if (!chat) return;

  const message = chat.messages.find((item) => item.id === messageNode.dataset.id);
  if (!message) return;

  const action = button.dataset.action;
  if (action === "toggle-read") {
    message.read = !message.read;
    saveState();
    renderMessages();
    return;
  }
  if (action === "reply") {
    setReplyTarget(message);
    return;
  }
  if (action === "insert-above") {
    setInsertTarget(message, "above", false);
    if (elements.messageInput) elements.messageInput.focus();
    return;
  }
  if (action === "insert-below") {
    setInsertTarget(message, "below", false);
    if (elements.messageInput) elements.messageInput.focus();
    return;
  }
  if (action === "insert-reply") {
    setInsertTarget(message, "below", true);
    if (elements.messageInput) elements.messageInput.focus();
    return;
  }
  if (action === "edit") {
    if (message.status === "recalled") return;
    state.editingId = message.id;
    renderMessages();
    const editBox = elements.messageList.querySelector(`.message[data-id="${message.id}"] textarea`);
    if (editBox) editBox.focus();
    return;
  }

  if (action === "delete") {
    if (state.insertTarget && state.insertTarget.id === message.id) {
      clearInsertTarget();
    }
    chat.messages = chat.messages.filter((item) => item.id !== message.id);
    state.editingId = null;
    saveState();
    renderMessages();
    renderChatList();
    return;
  }

  if (action === "recall") {
    if (message.type === "system") return;
    message.status = "recalled";
    state.editingId = null;
    saveState();
    renderMessages();
    renderChatList();
  }
};

const handleEditAction = (event) => {
  if (isViewerMode()) return;
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const messageNode = event.target.closest(".message");
  if (!messageNode) return;

  const chat = getActiveChat();
  if (!chat) return;

  const message = chat.messages.find((item) => item.id === messageNode.dataset.id);
  if (!message) return;

  if (button.dataset.action === "cancel") {
    state.editingId = null;
    renderMessages();
    return;
  }

  if (button.dataset.action === "save") {
    const textarea = messageNode.querySelector("textarea");
    if (!textarea) return;
    const value = textarea.value.trim();
    if (!value) return;
    message.text = value;
    const timeInput = messageNode.querySelector(".edit-time-input");
    if (timeInput) {
      const timeValue = timeInput.value.trim();
      if (timeValue) {
        message.timeText = timeValue;
        message.sortTime = parseTimeSortValue(timeValue, message.timestamp);
      } else {
        delete message.timeText;
        message.sortTime = message.timestamp;
      }
    }
    const senderSelect = messageNode.querySelector(".edit-sender-input");
    if (senderSelect) {
      const senderValue = senderSelect.value;
      if (senderValue === "__system__") {
        message.type = "system";
        message.senderId = null;
        if (message.imageUrl) delete message.imageUrl;
        if (!message.text) message.text = "系统消息";
      } else {
        message.senderId = senderValue;
        if (message.type === "system") {
          message.type = "text";
        }
      }
    }
    state.editingId = null;
    saveState();
    renderMessages();
    renderChatList();
  }
};

const renderStatusOptions = () => {
  const chat = getActiveChat();
  if (!chat) {
    elements.statusSelect.innerHTML = "";
    elements.statusSelect.disabled = true;
    elements.statusCustom.style.display = "none";
    return;
  }
  elements.statusSelect.disabled = isViewerMode();
  elements.statusCustom.style.display = "none";

  if (!state.statusOptions.includes(chat.status)) {
    state.statusOptions.push(chat.status);
  }

  elements.statusSelect.innerHTML = "";
  state.statusOptions.forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    elements.statusSelect.appendChild(option);
  });

  const customOption = document.createElement("option");
  customOption.value = "__custom__";
  customOption.textContent = "自定义...";
  elements.statusSelect.appendChild(customOption);

  elements.statusSelect.value = chat.status;
};

const handleStatusChange = () => {
  if (isViewerMode()) return;
  const chat = getActiveChat();
  if (!chat) return;

  if (elements.statusSelect.value === "__custom__") {
    elements.statusCustom.style.display = "flex";
    elements.statusCustomInput.focus();
    return;
  }
  elements.statusCustom.style.display = "none";
  chat.status = elements.statusSelect.value;
  saveState();
};

const addCustomStatus = () => {
  if (isViewerMode()) return;
  const chat = getActiveChat();
  if (!chat) return;
  const value = elements.statusCustomInput.value.trim();
  if (!value) return;
  if (!state.statusOptions.includes(value)) {
    state.statusOptions.push(value);
  }
  chat.status = value;
  elements.statusCustomInput.value = "";
  elements.statusCustom.style.display = "none";
  saveState();
  renderStatusOptions();
};

const renderGroupMemberOptions = (chat) => {
  elements.groupMemberOptions.innerHTML = "";
  if (!chat) return;

  const memberIds = Array.isArray(chat.memberIds) ? chat.memberIds : [];
  const roles = getAllRolesForChat(chat);
  roles.forEach((role) => {
    const label = document.createElement("label");
    label.className = "option-card";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = role.id;
    input.checked = memberIds.includes(role.id);

    const name = document.createElement("span");
    name.textContent = role.name;
    if (isLocalRole(chat, role.id)) {
      const tag = document.createElement("span");
      tag.className = "role-tag";
      tag.textContent = "本地联系人";
      name.appendChild(tag);
    }

    label.appendChild(input);
    label.appendChild(name);
    elements.groupMemberOptions.appendChild(label);
  });
};

const getSelectedGroupMembers = () => {
  const inputs = Array.from(elements.groupMemberOptions.querySelectorAll("input[type=\"checkbox\"]"));
  return inputs.filter((input) => input.checked).map((input) => input.value);
};

const openChatModal = () => {
  if (isViewerMode()) return;
  const chat = getActiveChat();
  if (!chat) return;

  if (isGroupChat(chat)) {
    elements.chatNameLabel.textContent = "群聊名称";
    elements.chatName.placeholder = "群聊";
    elements.chatName.value = chat.groupName || "";
    elements.groupMemberSection.style.display = "grid";
    elements.chatSettingsHint.textContent = "取消勾选即可移出成员。";
    renderGroupMemberOptions(chat);
  } else {
    const otherRole = getChatTargets(chat)[0];
    elements.chatNameLabel.textContent = "备注";
    elements.chatName.placeholder = otherRole ? otherRole.name : "给对方设置备注";
    elements.chatName.value = chat.remark || "";
    elements.groupMemberSection.style.display = "none";
  }

  elements.chatIntro.value = chat.intro || "";
  elements.chatModal.classList.add("show");
  elements.chatModal.setAttribute("aria-hidden", "false");
};

const closeChatModal = () => {
  elements.chatModal.classList.remove("show");
  elements.chatModal.setAttribute("aria-hidden", "true");
};

const deleteActiveChat = () => {
  if (isViewerMode()) return;
  const chat = getActiveChat();
  if (!chat) return;
  const confirmed = window.confirm("确定要删除该对话吗？");
  if (!confirmed) return;

  state.chats = state.chats.filter((item) => item.id !== chat.id);
  state.activeChatId = state.chats[0] ? state.chats[0].id : null;
  state.editingId = null;
  clearReplyTarget();
  clearInsertTarget();
  if (bulkState.active) setBulkMode(false);
  saveState();
  renderChatList();
  renderConversationHeader();
  renderMessages();
  closeChatModal();
};

const openExportModal = () => {
  if (!state.chats.length) return;
  const hasCurrent = Boolean(getActiveChat());
  const currentOption = elements.exportScope.querySelector("option[value=\"current\"]");
  if (currentOption) currentOption.disabled = !hasCurrent;
  elements.exportScope.value = hasCurrent ? "current" : "all";
  elements.exportFormat.value = "txt";
  elements.exportHint.style.display = "none";
  elements.exportModal.classList.add("show");
  elements.exportModal.setAttribute("aria-hidden", "false");
};

const closeExportModal = () => {
  elements.exportModal.classList.remove("show");
  elements.exportModal.setAttribute("aria-hidden", "true");
};

const saveChatSettings = () => {
  if (isViewerMode()) return;
  const chat = getActiveChat();
  if (!chat) return;

  if (isGroupChat(chat)) {
    chat.groupName = elements.chatName.value.trim();
    if (!chat.groupName) chat.groupName = "群聊";

    const previousMembers = new Set(chat.memberIds || []);
    const selectedMembers = getSelectedGroupMembers();

    if (selectedMembers.length === 0) {
      elements.chatSettingsHint.textContent = "群聊至少保留一个成员。";
      return;
    }

    const selectedSet = new Set(selectedMembers);
    const added = selectedMembers.filter((id) => !previousMembers.has(id));
    const removed = Array.from(previousMembers).filter((id) => !selectedSet.has(id));

    chat.memberIds = selectedMembers;
    chat.participantIds = selectedMembers.filter((id) => id !== chat.userRoleId);

    added.forEach((id) => {
      const role = getRoleByIdInChat(chat, id);
      if (role) addSystemMessage(chat, `（${role.name}）加入了群聊`);
    });

    removed.forEach((id) => {
      const role = getRoleByIdInChat(chat, id);
      if (role) addSystemMessage(chat, `（${role.name}）已被移出群聊`);
    });
  } else {
    chat.remark = elements.chatName.value.trim();
  }

  chat.intro = elements.chatIntro.value.trim() || "开始聊天吧！";

  saveState();
  renderChatList();
  renderConversationHeader();
  renderMessages();
  closeChatModal();
};

const resetChatCreateState = () => {
  createChatState.userRoleId = state.roles[0] ? state.roles[0].id : null;
  createChatState.targetIds = [];
  elements.groupName.value = "";
  elements.privateRemark.value = "";
  elements.chatCreateIntro.value = "";
};

const updateChatCreateFields = () => {
  const count = createChatState.targetIds.length;
  if (count > 1) {
    elements.groupFields.style.display = "grid";
    elements.privateFields.style.display = "none";
  } else if (count === 1) {
    elements.groupFields.style.display = "none";
    elements.privateFields.style.display = "grid";
  } else {
    elements.groupFields.style.display = "none";
    elements.privateFields.style.display = "none";
  }

  const valid = Boolean(createChatState.userRoleId) && count >= 1;
  elements.createChatBtn.disabled = !valid;
    elements.chatCreateHint.textContent = valid
      ? "可以创建对话。"
      : "请选择用户联系人与聊天联系人。";
};

const renderChatCreateOptions = () => {
  elements.userRoleOptions.innerHTML = "";
  elements.chatTargetOptions.innerHTML = "";

  if (!state.roles.length) {
    updateChatCreateFields();
    return;
  }

  if (!createChatState.userRoleId) {
    createChatState.userRoleId = state.roles[0].id;
  }

  state.roles.forEach((role) => {
    const label = document.createElement("label");
    label.className = "option-card";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "user-role";
    input.value = role.id;
    input.checked = createChatState.userRoleId === role.id;
    input.addEventListener("change", () => {
      createChatState.userRoleId = role.id;
      createChatState.targetIds = createChatState.targetIds.filter((id) => id !== role.id);
      renderChatCreateOptions();
    });

    const name = document.createElement("span");
    name.textContent = role.name;

    label.appendChild(input);
    label.appendChild(name);
    elements.userRoleOptions.appendChild(label);
  });

  state.roles
    .filter((role) => role.id !== createChatState.userRoleId)
    .forEach((role) => {
      const label = document.createElement("label");
      label.className = "option-card";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = role.id;
      input.checked = createChatState.targetIds.includes(role.id);
      input.addEventListener("change", () => {
        if (input.checked) {
          createChatState.targetIds.push(role.id);
        } else {
          createChatState.targetIds = createChatState.targetIds.filter((id) => id !== role.id);
        }
        updateChatCreateFields();
      });

      const name = document.createElement("span");
      name.textContent = role.name;

      label.appendChild(input);
      label.appendChild(name);
      elements.chatTargetOptions.appendChild(label);
    });

  updateChatCreateFields();
};

const openChatCreateModal = () => {
  if (isViewerMode()) return;
  resetChatCreateState();
  renderChatCreateOptions();
  elements.chatCreateModal.classList.add("show");
  elements.chatCreateModal.setAttribute("aria-hidden", "false");
};

const closeChatCreateModal = () => {
  elements.chatCreateModal.classList.remove("show");
  elements.chatCreateModal.setAttribute("aria-hidden", "true");
};

const createChat = () => {
  if (isViewerMode()) return;
  if (!createChatState.userRoleId || createChatState.targetIds.length === 0) return;
  const isGroup = createChatState.targetIds.length > 1;
  const memberIds = [createChatState.userRoleId, ...createChatState.targetIds];

  const chat = {
    id: createId(),
    userRoleId: createChatState.userRoleId,
    participantIds: [...createChatState.targetIds],
    memberIds: Array.from(new Set(memberIds)),
    isGroup,
    groupName: isGroup ? elements.groupName.value.trim() : "",
    remark: !isGroup ? elements.privateRemark.value.trim() : "",
    intro: elements.chatCreateIntro.value.trim() || "开始聊天吧！",
    status: state.statusOptions[0] || "在线",
    messages: [],
    localRoles: [],
  };

  if (isGroup && !chat.groupName) {
    chat.groupName = "群聊";
  }

  state.chats.push(chat);
  state.activeChatId = chat.id;
  state.editingId = null;

  saveState();
  closeChatCreateModal();
  renderChatList();
  renderConversationHeader();
  renderMessages();
};

const handleImageUpload = () => {
  if (isViewerMode()) return;
  const chat = getActiveChat();
  if (!chat || !Array.isArray(chat.memberIds) || chat.memberIds.length < 1) return;
  const file = elements.imageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    addImageMessage(reader.result, file.name);
    elements.imageInput.value = "";
  };
  reader.onerror = () => {
    console.warn("图片读取失败");
  };
  reader.readAsDataURL(file);
};

const openImageModal = (src, altText) => {
  elements.imagePreview.src = src;
  elements.imagePreview.alt = altText || "预览图片";
  elements.imageModal.classList.add("show");
  elements.imageModal.setAttribute("aria-hidden", "false");
};

const closeImageModal = () => {
  elements.imageModal.classList.remove("show");
  elements.imageModal.setAttribute("aria-hidden", "true");
  elements.imagePreview.src = "";
};

const setupEvents = () => {
  const on = (el, type, handler) => {
    if (el) el.addEventListener(type, handler);
  };

  on(elements.sendBtn, "click", handleSend);
  on(elements.messageInput, "keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  });
  on(elements.cancelReply, "click", clearReplyTarget);
  on(elements.cancelInsert, "click", clearInsertTarget);

  on(elements.openRoleModal, "click", openModal);
  on(elements.roleModal, "click", (event) => {
    if (event.target.dataset.close) closeModal();
  });

  on(elements.createRole, "click", createRole);
  on(elements.roleName, "input", updateAvatarPreview);
  on(elements.roleAvatar, "input", () => {
    delete elements.roleAvatar.dataset.upload;
    updateAvatarPreview();
  });
  on(elements.roleAvatarFile, "change", handleAvatarFile);

  on(elements.roleToggle, "click", () => {
    uiState.rolesCollapsed = !uiState.rolesCollapsed;
    saveUiState();
    applyUiState();
  });
  on(elements.chatToggle, "click", () => {
    uiState.chatsCollapsed = !uiState.chatsCollapsed;
    saveUiState();
    applyUiState();
  });
  on(elements.modeAdmin, "click", () => setMode("admin"));
  on(elements.modeViewer, "click", () => setMode("viewer"));
  on(elements.themeSelect, "change", (event) => setTheme(event.target.value));
  on(elements.backupAuto, "change", async (event) => {
    backupState.auto = event.target.checked;
    saveBackupState();
    updateBackupUI();
    if (backupState.auto && !backupState.handle) {
      await chooseBackupFile();
    }
    if (backupState.auto && backupState.handle) {
      requestAutoBackup();
    }
  });
  on(elements.backupPick, "click", async () => {
    await chooseBackupFile();
  });
  on(elements.backupNow, "click", async () => {
    if (!supportsFileBackup()) {
      downloadBackupFile();
      return;
    }
    if (!backupState.handle) {
      const handle = await chooseBackupFile();
      if (!handle) return;
    }
    await writeBackupToHandle();
  });
  on(elements.backupDownload, "click", () => {
    downloadBackupFile();
  });
  on(elements.bulkToggle, "click", () => {
    if (isViewerMode()) return;
    setBulkMode(!bulkState.active);
  });
  on(elements.bulkSelectAll, "click", () => {
    selectAllMessages();
  });
  on(elements.bulkInvert, "click", () => {
    invertMessageSelection();
  });
  on(elements.bulkCancel, "click", () => {
    setBulkMode(false);
  });
  on(elements.bulkDelete, "click", () => {
    deleteSelectedMessages();
  });
  on(elements.sidebarToggle, "click", toggleSidebar);
  on(elements.sidebarToggleInline, "click", toggleSidebar);

  on(elements.messageList, "click", (event) => {
    const snippet = event.target.closest(".reply-snippet");
    if (snippet && snippet.dataset.replyId) {
      scrollToMessage(snippet.dataset.replyId);
      return;
    }
    const image = event.target.closest(".message-image");
    if (image) {
      openImageModal(image.src, image.alt);
      return;
    }

    if (event.target.closest(".edit-box")) {
      handleEditAction(event);
    } else {
      handleMessageAction(event);
    }
  });
  on(elements.messageList, "change", (event) => {
    const checkbox = event.target.closest(".message-checkbox");
    if (!checkbox) return;
    const messageNode = event.target.closest(".message");
    if (!messageNode) return;
    toggleBulkSelection(messageNode.dataset.id, checkbox.checked);
    messageNode.classList.toggle("is-selected", checkbox.checked);
  });

  on(elements.statusSelect, "change", handleStatusChange);
  on(elements.statusCustomBtn, "click", addCustomStatus);

  on(elements.openChatSettings, "click", openChatModal);
  on(elements.chatModal, "click", (event) => {
    if (event.target.dataset.close === "chat") closeChatModal();
  });
  on(elements.saveChat, "click", saveChatSettings);
  on(elements.deleteChatBtn, "click", deleteActiveChat);

  on(elements.openExport, "click", openExportModal);
  on(elements.exportModal, "click", (event) => {
    if (event.target.dataset.close === "export") closeExportModal();
  });
  on(elements.exportFormat, "change", () => {
    elements.exportHint.style.display = "none";
  });
  on(elements.exportConfirm, "click", () => {
    exportChats();
    closeExportModal();
  });

  on(elements.openChatCreate, "click", openChatCreateModal);
  on(elements.chatCreateModal, "click", (event) => {
    if (event.target.dataset.close === "create-chat") closeChatCreateModal();
  });
  on(elements.createChatBtn, "click", createChat);

  on(elements.imageBtn, "click", () => {
    elements.imageInput.value = "";
    elements.imageInput.click();
  });
  on(elements.imageInput, "change", handleImageUpload);

  on(elements.imageModal, "click", (event) => {
    if (event.target.dataset.close === "image") closeImageModal();
  });
};

const safeRun = (fn) => {
  try {
    fn();
  } catch (error) {
    console.error("初始化步骤失败", error);
  }
};

const init = () => {
  setElements();
  hideJsWarning();
  setupEvents();
  safeRun(loadUiState);
  safeRun(loadBackupState);
  safeRun(applyUiState);
  safeRun(loadState);
  safeRun(renderRoles);
  safeRun(renderChatList);
  safeRun(renderConversationHeader);
  safeRun(renderMessages);
  safeRun(updateAvatarPreview);
  safeRun(clearReplyTarget);
  safeRun(updateInsertPreview);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

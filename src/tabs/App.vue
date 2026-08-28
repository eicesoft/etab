<template>
  <div class="tabs-page">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <h1 class="logo">eTab</h1>
        <span class="subtitle">标签页管理器</span>
      </div>
      <div class="header-right">
        <span class="badge badge-primary">{{ totalTabs }} 个标签页</span>
        <span class="badge badge-warning">{{ windows.length }} 个窗口</span>
        <button class="btn-primary" @click="refresh">⟳ 刷新</button>
        <button class="btn-ghost" @click="openOptions">⚙ 设置</button>
      </div>
    </header>

    <div class="main-layout">
      <!-- 左侧栏：收藏集列表 -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">收藏集</span>
          <button class="btn-sm" title="新建收藏集" @click="startCreateCollect">+</button>
        </div>
        <div class="collect-list">
          <div
            v-for="coll in collects"
            :key="coll.id"
            class="collect-item"
            :class="{
              active: coll.id === selectedCollectId,
              'drag-over': dragOverCollectId === coll.id,
            }"
            @click="selectedCollectId = coll.id"
            @dragover.prevent="onDragOver(coll.id)"
            @dragenter.prevent="onDragEnter(coll.id)"
            @dragleave="onDragLeave(coll.id)"
            @drop.prevent="onDrop(coll.id, $event)"
          >
            <div class="collect-info">
              <!-- 编辑状态 -->
              <template v-if="editingCollectId === coll.id">
                <input
                  v-model="editingCollectName"
                  class="collect-rename-input"
                  @keydown.enter="confirmRename(coll.id)"
                  @keydown.escape="cancelRename"
                  @click.stop
                  autofocus
                />
              </template>
              <!-- 显示状态 -->
              <template v-else>
                <span class="collect-icon">{{ isDefault(coll.id) ? '📁' : '📂' }}</span>
                <span class="collect-name">{{ coll.name }}</span>
              </template>
            </div>
            <span class="collect-count">{{ isDefault(coll.id) ? liveTabsCount : coll.tabs.length }}</span>
            <!-- 非 Default 才显示编辑/删除按钮 -->
            <div v-if="!isDefault(coll.id)" class="collect-actions" @click.stop>
              <button class="btn-sm" title="重命名" @click="startRename(coll)">✏️</button>
              <button class="btn-sm" title="删除" @click="confirmDelete(coll)">🗑️</button>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧主区域 -->
      <main class="main-content">
        <!-- 搜索栏 -->
        <div class="toolbar">
          <div class="search-bar">
            <input
              v-model="searchQuery"
              type="search"
              placeholder="搜索标签页标题或 URL..."
            />
          </div>
          <div class="toolbar-actions">
            <button
              class="btn-ghost"
              :class="{ active: viewMode === 'window' }"
              @click="viewMode = 'window'"
            >
              📂 按窗口分组
            </button>
            <button
              class="btn-ghost"
              :class="{ active: viewMode === 'flat' }"
              @click="viewMode = 'flat'"
            >
              📋 平铺列表
            </button>
          </div>
        </div>

        <!-- 加载 -->
        <div v-if="pageLoading" class="loading-spinner">加载中...</div>

        <!-- 空状态 -->
        <div v-else-if="displayTabs.length === 0" class="empty-state">
          <div class="icon">📑</div>
          <p v-if="searchQuery">没有找到匹配的标签页</p>
          <p v-else-if="isDefault(selectedCollectId)">暂无标签页</p>
          <p v-else>此收藏集暂无标签页，拖拽标签页 favicon 到左侧收藏集即可加入</p>
        </div>

        <!-- Default 收藏集：实时标签页，支持窗口/平铺视图 -->
        <template v-else-if="isDefault(selectedCollectId)">
          <!-- 按窗口分组视图 -->
          <template v-if="viewMode === 'window'">
            <div v-for="win in windows" :key="win.windowId" class="window-group">
              <div class="window-header">
                <h2>{{ win.windowName }}</h2>
                <span class="badge badge-primary">{{ win.tabs.length }} 个标签页</span>
              </div>
              <div class="tab-grid">
                <div v-for="tab in win.tabs" :key="tab.id" class="tab-card" @click="activateTab(tab)">
                  <img
                    class="favicon drag-handle"
                    :src="tab.favIconUrl || defaultFavicon"
                    alt=""
                    draggable="true"
                    @dragstart="onDragStart($event, tab)"
                    @error="onFaviconError"
                  />
                  <div class="tab-body">
                    <div class="tab-title" :title="tab.title + '\n' + tab.url">{{ tab.title }}</div>
                  </div>
                  <div class="tab-meta">
                    <span v-if="tab.active" class="badge badge-primary">当前</span>
                  </div>
                  <div class="tab-actions">
                    <button class="btn-sm" title="重新加载" @click.stop="reloadTab(tab)">⟳</button>
                    <div class="dropdown" @click.stop>
                      <button class="btn-sm btn-more" title="更多">···</button>
                      <div class="dropdown-menu">
                        <button @click="pinTab(tab)">{{ tab.pinned ? '取消固定' : '固定标签页' }}</button>
                        <button @click="muteTab(tab)">{{ tab.muted ? '取消静音' : '静音标签页' }}</button>
                        <button @click="duplicateTab(tab)">复制标签页</button>
                        <div class="dropdown-divider"></div>
                        <button
                          v-for="coll in getAvailableCollects(tab.id)"
                          :key="coll.id"
                          @click="addTabToCollect(coll.id, { id: tab.id, title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl })"
                        >
                          ➕ 加入「{{ coll.name }}」
                        </button>
                        <div class="dropdown-divider"></div>
                        <button class="danger" @click="closeTab(tab)">关闭标签页</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <!-- 平铺列表视图 -->
          <template v-else>
            <div class="tab-grid">
              <div v-for="tab in displayTabs" :key="tab.id" class="tab-card" @click="activateTab(tab)">
                <img
                  class="favicon drag-handle"
                  :src="tab.favIconUrl || defaultFavicon"
                  alt=""
                  draggable="true"
                  @dragstart="onDragStart($event, tab)"
                  @error="onFaviconError"
                />
                <div class="tab-body">
                  <div class="tab-title" :title="tab.title + '\n' + tab.url">{{ tab.title }}</div>
                </div>
                <div class="tab-meta">
                  <span v-if="tab.active" class="badge badge-primary">当前</span>
                </div>
                <div class="tab-actions">
                  <button class="btn-sm" title="重新加载" @click.stop="reloadTab(tab)">⟳</button>
                  <div class="dropdown" @click.stop>
                    <button class="btn-sm btn-more" title="更多">···</button>
                    <div class="dropdown-menu">
                      <button @click="pinTab(tab)">{{ tab.pinned ? '取消固定' : '固定标签页' }}</button>
                      <button @click="muteTab(tab)">{{ tab.muted ? '取消静音' : '静音标签页' }}</button>
                      <button @click="duplicateTab(tab)">复制标签页</button>
                      <div class="dropdown-divider"></div>
                      <button
                        v-for="coll in getAvailableCollects(tab.id)"
                        :key="coll.id"
                        @click="addTabToCollect(coll.id, { id: tab.id, title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl })"
                      >
                        ➕ 加入「{{ coll.name }}」
                      </button>
                      <div class="dropdown-divider"></div>
                      <button class="danger" @click="closeTab(tab)">关闭标签页</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>

        <!-- 非 Default 收藏集：已保存的标签页 -->
        <template v-else>
          <div class="saved-tabs-header">
            <span class="saved-tabs-title">收藏集「{{ selectedCollect.name }}」— {{ selectedCollect.tabs.length }} 个标签页</span>
          </div>
          <div class="tab-grid">
            <div v-for="stored in displayTabs" :key="stored.id" class="tab-card" @click="openSavedTab(stored)">
              <img
                class="favicon"
                :src="stored.favIconUrl || defaultFavicon"
                alt=""
                @error="onFaviconError"
              />
              <div class="tab-body">
                <div class="tab-title" :title="stored.title + '\n' + stored.url" :class="{ 'tab-url-visible': true }">{{ stored.title }}</div>
                <div class="tab-url">{{ stored.url }}</div>
              </div>
              <div class="tab-actions">
                <button class="btn-sm" title="打开标签页" @click.stop="openSavedTab(stored)">↗</button>
                <div class="dropdown" @click.stop>
                  <button class="btn-sm btn-more" title="更多">···</button>
                  <div class="dropdown-menu">
                    <button @click="openSavedTab(stored)">打开标签页</button>
                    <button @click="copyUrl(stored)">复制链接</button>
                    <div class="dropdown-divider"></div>
                    <button class="danger" @click="removeTabFromCollect(selectedCollectId, stored.id)">移出收藏集</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTabs } from '../shared/useTabs.js'
import { useCollects } from '../shared/useCollects.js'
import {
  activateTab as activateTabApi,
  closeTab as closeTabApi,
  reloadTab as reloadTabApi,
  pinTab as pinTabApi,
  muteTab as muteTabApi,
  duplicateTab as duplicateTabApi,
  createTab,
  DEFAULT_FAVICON,
} from '../shared/api.js'

const {
  tabs,
  loading: tabsLoading,
  refresh,
} = useTabs()

const {
  collects,
  selectedCollectId,
  selectedCollect,
  loading: collectsLoading,
  init: initCollects,
  addCollect,
  renameCollect,
  removeCollect,
  addTabToCollect,
  removeTabFromCollect,
  isDefault,
  getAvailableCollects,
  DEFAULT_COLLECT_ID,
} = useCollects()

const pageLoading = computed(() => tabsLoading.value || collectsLoading.value)

const searchQuery = ref('')
const viewMode = ref('window')
const defaultFavicon = DEFAULT_FAVICON()

// 编辑收藏集状态
const editingCollectId = ref(null)
const editingCollectName = ref('')

// 拖拽状态
const dragOverCollectId = ref(null)
const dragTabData = ref(null)

onMounted(() => {
  initCollects()
})

// ---- 计算属性 ----

// Default 显示所有打开的标签页；非 Default 显示已保存的标签页
const displayTabs = computed(() => {
  if (isDefault(selectedCollectId.value)) {
    // 实时标签页 + 搜索过滤
    let list = tabs.value
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.url.toLowerCase().includes(q)
      )
    }
    return list
  }
  // 已保存的标签页 + 搜索过滤
  if (!selectedCollect.value) return []
  let list = selectedCollect.value.tabs
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.url.toLowerCase().includes(q)
    )
  }
  return list
})

const liveTabsCount = computed(() => tabs.value.length)

const totalTabs = computed(() => {
  if (isDefault(selectedCollectId.value)) return tabs.value.length
  return selectedCollect.value ? selectedCollect.value.tabs.length : 0
})

const windows = computed(() => {
  const map = {}
  for (const tab of displayTabs.value) {
    if (!map[tab.windowId]) {
      map[tab.windowId] = {
        windowId: tab.windowId,
        windowName: `Window ${tab.windowId}`,
        tabs: [],
      }
    }
    map[tab.windowId].tabs.push(tab)
  }
  return Object.values(map)
})

// ---- 标签页事件 ----

function onFaviconError(e) {
  e.target.src = defaultFavicon
}

async function activateTab(tab) {
  await activateTabApi(tab.id, tab.windowId)
}

async function openSavedTab(stored) {
  await createTab(stored.url)
}

async function closeTab(tab) {
  await closeTabApi(tab.id)
}

async function reloadTab(tab) {
  await reloadTabApi(tab.id)
}

async function openOptions() {
  chrome.runtime.openOptionsPage()
}

async function pinTab(tab) {
  await pinTabApi(tab.id, !tab.pinned)
}

async function muteTab(tab) {
  await muteTabApi(tab.id, !tab.muted)
}

async function duplicateTab(tab) {
  await duplicateTabApi(tab.id)
}

async function copyUrl(stored) {
  try {
    await navigator.clipboard.writeText(stored.url)
  } catch {
    // fallback
  }
}

// ---- 收藏集操作 ----

function startCreateCollect() {
  const name = prompt('输入新收藏集名称：')
  if (name && name.trim()) {
    addCollect(name.trim())
  }
}

function startRename(coll) {
  editingCollectId.value = coll.id
  editingCollectName.value = coll.name
}

function confirmRename(id) {
  if (editingCollectName.value.trim()) {
    renameCollect(id, editingCollectName.value.trim())
  }
  cancelRename()
}

function cancelRename() {
  editingCollectId.value = null
  editingCollectName.value = ''
}

function confirmDelete(coll) {
  if (confirm(`确定删除收藏集「${coll.name}」？`)) {
    removeCollect(coll.id)
  }
}

// ---- 拖拽 ----

function onDragStart(e, tab) {
  dragTabData.value = {
    id: tab.id,
    title: tab.title,
    url: tab.url,
    favIconUrl: tab.favIconUrl,
  }
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(tab.id))
}

function onDragOver() {
  // preventDefault 已通过 .prevent 修饰符
}

function onDragEnter(collectId) {
  dragOverCollectId.value = collectId
}

function onDragLeave(collectId) {
  if (dragOverCollectId.value === collectId) {
    dragOverCollectId.value = null
  }
}

async function onDrop(collectId) {
  dragOverCollectId.value = null
  const tabData = dragTabData.value
  dragTabData.value = null
  if (!tabData) return

  // 保存到收藏集
  await addTabToCollect(collectId, tabData)

  // 非 Default 且是实时标签页则关闭
  if (!isDefault(collectId)) {
    try {
      await closeTabApi(tabData.id)
    } catch {
      // 标签页可能已关闭
    }
  }
}
</script>

<style scoped>
.tabs-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 24px 40px;
  min-height: 100vh;
  background: var(--bg-primary);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.logo {
  font-size: 24px;
  color: var(--accent);
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ===== 左右布局 ===== */
.main-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* 左侧栏 */
.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar-header .btn-sm {
  width: 22px;
  height: 22px;
  font-size: 16px;
  line-height: 1;
}

.collect-list {
  max-height: calc(100vh - 180px);
  overflow-y: auto;
}

.collect-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--border);
}
.collect-item:last-child {
  border-bottom: none;
}
.collect-item:hover {
  background: var(--bg-hover);
}
.collect-item.active {
  background: var(--accent-light);
  border-left: 3px solid var(--accent);
}
.collect-item.drag-over {
  background: var(--accent-light);
  border-left: 3px solid var(--accent);
  box-shadow: inset 0 0 0 2px var(--accent);
}

.collect-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.collect-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.collect-name {
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collect-rename-input {
  font-size: 13px;
  padding: 2px 6px;
  border: 1px solid var(--accent);
  border-radius: 4px;
  outline: none;
  width: 100%;
  background: var(--bg-card);
}

.collect-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 0 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

.collect-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.collect-item:hover .collect-actions {
  opacity: 1;
}

.collect-actions .btn-sm {
  width: 20px;
  height: 20px;
  font-size: 11px;
}

/* 右侧主区域 */
.main-content {
  flex: 1;
  min-width: 0;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.toolbar .search-bar {
  flex: 1;
  max-width: 400px;
}

.toolbar-actions {
  display: flex;
  gap: 4px;
}

.toolbar-actions .btn-ghost.active {
  background: var(--bg-hover);
  color: var(--accent);
  border-color: var(--accent);
}

/* Default 收藏集 - 已保存标签页头部 */
.saved-tabs-header {
  margin-bottom: 16px;
  padding: 10px 14px;
  background: var(--bg-card);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.saved-tabs-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.window-group {
  margin-bottom: 24px;
}

.window-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: var(--bg-card);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.window-header h2 {
  font-size: 15px;
  font-weight: 600;
  flex: 1;
}

.tab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 8px;
}

.tab-body {
  flex: 1;
  min-width: 0;
}

.tab-meta {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.tab-card .tab-url {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

/* 拖拽手柄 */
.drag-handle {
  cursor: grab;
}
.drag-handle:active {
  cursor: grabbing;
}

/* 小型按钮 */
.btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: 13px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-sm:hover {
  background: var(--bg-hover);
  color: var(--accent);
  border-color: var(--border);
}

/* 下拉菜单 */
.dropdown {
  position: relative;
  display: inline-flex;
}

.dropdown-menu {
  display: none;
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 100;
  min-width: 160px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  padding: 4px;
  margin-top: 4px;
}

.dropdown:hover .dropdown-menu,
.dropdown-menu:hover {
  display: block;
}

.dropdown-menu button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 12px;
  font-size: 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
}
.dropdown-menu button:hover {
  background: var(--bg-hover);
  color: var(--accent);
}
.dropdown-menu button.danger {
  color: var(--danger);
}
.dropdown-menu button.danger:hover {
  background: var(--danger-light);
}

.dropdown-divider {
  height: 1px;
  margin: 4px 8px;
  background: var(--border);
}
</style>
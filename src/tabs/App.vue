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
        <button class="btn-primary header-icon-button" title="刷新标签页" aria-label="刷新标签页" @click="refresh">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" /></svg>
        </button>
        <button class="btn-ghost header-icon-button" title="设置" aria-label="设置" @click="openOptions">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20.3h-3v-.08A1.7 1.7 0 0 0 10.68 18.66a1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7.02 15a1.7 1.7 0 0 0-1.56-1.03H5.4v-3h.06A1.7 1.7 0 0 0 7.02 9.94a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56V4.7h3v.08a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 8l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.04v3h-.04A1.7 1.7 0 0 0 19.4 15Z" /></svg>
        </button>
      </div>
    </header>

    <div
      v-motion
      class="main-layout"
      :initial="{ opacity: 0, y: 8 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 220 } }"
    >
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
            @click="selectCollect(coll.id)"
            @dragover.prevent="onDragOver(coll.id)"
            @dragenter.prevent="onDragEnter(coll.id)"
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
                <svg v-if="isDefault(coll.id)" class="collect-icon collect-default-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
                  <path d="M3.5 9h17M7 6.75h.01M10 6.75h.01" />
                </svg>
                <svg v-else class="collect-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3.5 7.5c0-1.1.9-2 2-2h4l1.7 2H18.5c1.1 0 2 .9 2 2v7c0 1.1-.9 2-2 2h-13c-1.1 0-2-.9-2-2v-9Z" />
                  <path d="M3.5 10.5h17" />
                </svg>
                <span class="collect-name" :class="{ 'collect-default-name': isDefault(coll.id) }">{{ coll.name }}</span>
              </template>
            </div>
            <span class="collect-count">{{ isDefault(coll.id) ? liveTabsCount : coll.tabs.length }}</span>
            <!-- 非 Default 才显示打开与更多操作 -->
            <div v-if="!isDefault(coll.id)" class="collect-actions" @click.stop>
              <button
                class="btn-sm collect-open-button"
                title="在当前窗口打开"
                aria-label="在当前窗口打开"
                @click="openCollectInCurrentWindow(coll)"
              >↗</button>
              <div class="dropdown">
                <button
                  class="btn-sm btn-more"
                  title="更多操作"
                  aria-label="更多操作"
                  @click="toggleCollectMenu(coll.id)"
                >⋮</button>
                <div class="dropdown-menu" :class="{ 'is-open': openMenuId === `collect-${coll.id}` }" @click.stop="closeMenu">
                  <button @click="startRename(coll)">重命名</button>
                  <div class="dropdown-divider"></div>
                  <button class="danger" @click="confirmDelete(coll)">删除收藏集</button>
                </div>
              </div>
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
              v-if="isDefault(selectedCollectId)"
              class="btn-primary ai-group-button"
              type="button"
              :disabled="aiGrouping || aiGroupingCandidates.length < 2"
              title="将未分组、未固定的标签标题与 URL 发送至已配置的 AI 服务"
              @click="groupDefaultTabsWithAi"
            >
              {{ aiGrouping ? 'AI 分组中…' : '✨ AI 智能分组' }}
            </button>
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

        <div v-if="isDefault(selectedCollectId)" class="ai-grouping-notice">
          <span>AI 仅整理未分组、未固定的标签；标签标题和 URL 会发送至你配置的 AI 服务。</span>
          <span v-if="aiGroupingStatus" class="ai-grouping-status" :class="aiGroupingStatus.type" role="status">
            {{ aiGroupingStatus.message }}
          </span>
        </div>

        <!-- 加载 -->
        <div v-if="pageLoading" class="loading-spinner">加载中...</div>

        <!-- 空状态 -->
        <div v-else-if="displayTabs.length === 0" class="empty-state">
          <div class="icon">📑</div>
          <p v-if="searchQuery">没有找到匹配的标签页</p>
          <p v-else-if="isDefault(selectedCollectId)">暂无标签页</p>
          <p v-else>此收藏集暂无标签页，拖拽标签页左侧把手到收藏集即可加入</p>
        </div>

        <!-- Default 收藏集：实时标签页，支持窗口/平铺视图 -->
        <template v-else-if="isDefault(selectedCollectId)">
          <!-- 按窗口分组视图 -->
          <template v-if="viewMode === 'window'">
            <div v-for="win in windows" :key="win.windowId" class="window-group">
              <div class="window-header">
                <h2>{{ win.windowName }}</h2>
                <span class="badge badge-primary">{{ win.tabs.length }} 个标签页</span>
                <form
                  v-if="savingWindowId === win.windowId"
                  class="window-collect-form"
                  @submit.prevent="saveWindowAsCollect(win)"
                  @click.stop
                >
                  <NSelect
                    v-model:value="windowCollectValue"
                    class="window-collect-select"
                    :options="collectOptions"
                    :on-create="createCollectOption"
                    filterable
                    tag
                    placeholder="选择或输入收藏集名称"
                    aria-label="选择或输入收藏集名称"
                    @keydown.escape="cancelWindowCollect"
                  />
                  <button class="btn-sm window-collect-confirm" type="submit" title="创建或加入收藏集" aria-label="创建或加入收藏集">✓</button>
                  <button class="btn-sm window-collect-cancel" type="button" title="取消" aria-label="取消" @click="cancelWindowCollect">×</button>
                </form>
                <button
                  v-else
                  class="btn-ghost window-collect-button"
                  title="将此窗口的标签页保存为收藏集"
                  @click="startWindowCollect(win)"
                >＋ 收藏集</button>
              </div>
              <div class="tab-grid">
                <div
                  v-for="tab in win.tabs"
                  :key="tab.id"
                  class="tab-card"
                  :class="[tabDragClasses(tab), { 'is-selected': isTabSelected(tab, DEFAULT_COLLECT_ID) }]"
                  :style="tabGroupStyle(tab)"
                  @click="activateTab(tab)"
                  @dragenter.prevent="onCardDragEnter($event, tab)"
                  @dragover.prevent="onCardDragOver($event, tab)"
                  @drop.prevent.stop="onCardDrop($event, tab)"
                >
                  <span
                    class="tab-drag-handle"
                    role="button"
                    tabindex="0"
                    title="拖动以调整标签页顺序或加入收藏集"
                    aria-label="拖动标签页"
                    draggable="true"
                    @click.stop
                    @dragstart="onDragStart($event, tab, DEFAULT_COLLECT_ID)"
                    @dragend="onDragEnd"
                  >⠿</span>
                  <button
                    type="button"
                    class="tab-select-control"
                    :class="{ 'is-selected': isTabSelected(tab, DEFAULT_COLLECT_ID) }"
                    :title="isTabSelected(tab, DEFAULT_COLLECT_ID) ? '取消选择' : '选择标签页'"
                    @click.stop="toggleTabSelection(tab, DEFAULT_COLLECT_ID)"
                  >
                    <img class="favicon" :src="tab.favIconUrl || defaultFavicon" alt="" @error="onFaviconError" />
                    <span class="tab-select-checkbox" aria-hidden="true">✓</span>
                  </button>
                  <div class="tab-body">
                    <div class="tab-title" :title="tab.title + '\n' + tab.url">{{ tab.title }}</div>
                  </div>
                  <div class="tab-meta">
                    <span v-if="tabGroupInfo(tab)" class="tab-group-chip" :title="`标签组：${tabGroupInfo(tab).title}`">
                      <span class="tab-group-dot" aria-hidden="true"></span>
                      {{ tabGroupInfo(tab).title }}
                    </span>
                    <span v-if="tab.pinned" class="tab-pinned-indicator" title="已固定标签页" aria-label="已固定标签页">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6M10 4v5l-2 3h8l-2-3V4M12 12v8" /></svg>
                    </span>
                    <span v-if="tab.active" class="badge badge-primary">当前</span>
                  </div>
                  <div class="tab-actions">
                    <button class="btn-sm" title="重新加载" @click.stop="reloadTab(tab)">⟳</button>
                    <div class="dropdown" @click.stop>
                      <button class="btn-sm btn-more" title="更多" aria-label="更多操作" @click="toggleMenu(`tab-${tab.id}`)">⋮</button>
                      <div class="dropdown-menu" :class="{ 'is-open': openMenuId === `tab-${tab.id}` }" @click.stop="closeMenu">
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
              <div
                v-for="tab in displayTabs"
                :key="tab.id"
                class="tab-card"
                :class="[tabDragClasses(tab), { 'is-selected': isTabSelected(tab, DEFAULT_COLLECT_ID) }]"
                :style="tabGroupStyle(tab)"
                @click="activateTab(tab)"
                @dragenter.prevent="onCardDragEnter($event, tab)"
                @dragover.prevent="onCardDragOver($event, tab)"
                @drop.prevent.stop="onCardDrop($event, tab)"
              >
                <span
                  class="tab-drag-handle"
                  role="button"
                  tabindex="0"
                  title="拖动以调整标签页顺序或加入收藏集"
                  aria-label="拖动标签页"
                  draggable="true"
                  @click.stop
                  @dragstart="onDragStart($event, tab, DEFAULT_COLLECT_ID)"
                  @dragend="onDragEnd"
                >⠿</span>
                <button
                  type="button"
                  class="tab-select-control"
                  :class="{ 'is-selected': isTabSelected(tab, DEFAULT_COLLECT_ID) }"
                  :title="isTabSelected(tab, DEFAULT_COLLECT_ID) ? '取消选择' : '选择标签页'"
                  @click.stop="toggleTabSelection(tab, DEFAULT_COLLECT_ID)"
                >
                  <img class="favicon" :src="tab.favIconUrl || defaultFavicon" alt="" @error="onFaviconError" />
                  <span class="tab-select-checkbox" aria-hidden="true">✓</span>
                </button>
                <div class="tab-body">
                  <div class="tab-title" :title="tab.title + '\n' + tab.url">{{ tab.title }}</div>
                  </div>
                <div class="tab-meta">
                    <span v-if="tabGroupInfo(tab)" class="tab-group-chip" :title="`标签组：${tabGroupInfo(tab).title}`">
                      <span class="tab-group-dot" aria-hidden="true"></span>
                      {{ tabGroupInfo(tab).title }}
                    </span>
                    <span v-if="tab.pinned" class="tab-pinned-indicator" title="已固定标签页" aria-label="已固定标签页">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6M10 4v5l-2 3h8l-2-3V4M12 12v8" /></svg>
                    </span>
                    <span v-if="tab.active" class="badge badge-primary">当前</span>
                  </div>
                <div class="tab-actions">
                  <button class="btn-sm" title="重新加载" @click.stop="reloadTab(tab)">⟳</button>
                  <div class="dropdown" @click.stop>
                    <button class="btn-sm btn-more" title="更多" aria-label="更多操作" @click="toggleMenu(`tab-${tab.id}`)">⋮</button>
                    <div class="dropdown-menu" :class="{ 'is-open': openMenuId === `tab-${tab.id}` }" @click.stop="closeMenu">
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
            <div
              v-for="stored in displayTabs"
              :key="stored.id"
              class="tab-card"
              :class="[tabDragClasses(stored), { 'is-selected': isTabSelected(stored, selectedCollectId) }]"
              @click="openSavedTab(stored)"
              @dragenter.prevent="onCardDragEnter($event, stored)"
              @dragover.prevent="onCardDragOver($event, stored)"
              @drop.prevent.stop="onCardDrop($event, stored)"
            >
              <span
                class="tab-drag-handle"
                role="button"
                tabindex="0"
                title="拖动以调整收藏集内标签页顺序"
                aria-label="拖动标签页"
                draggable="true"
                @click.stop
                @dragstart="onDragStart($event, stored, selectedCollectId)"
                @dragend="onDragEnd"
              >⠿</span>
              <button
                type="button"
                class="tab-select-control"
                :class="{ 'is-selected': isTabSelected(stored, selectedCollectId) }"
                :title="isTabSelected(stored, selectedCollectId) ? '取消选择' : '选择标签页'"
                @click.stop="toggleTabSelection(stored, selectedCollectId)"
              >
                <img class="favicon" :src="stored.favIconUrl || defaultFavicon" alt="" @error="onFaviconError" />
                <span class="tab-select-checkbox" aria-hidden="true">✓</span>
              </button>
              <div class="tab-body">
                <div class="tab-title" :title="stored.title + '\n' + stored.url" :class="{ 'tab-url-visible': true }">{{ stored.title }}</div>
                <div class="tab-url">{{ stored.url }}</div>
              </div>
              <div class="tab-actions">
                <button class="btn-sm" title="打开标签页" @click.stop="openSavedTab(stored)">↗</button>
                <div class="dropdown" @click.stop>
                  <button class="btn-sm btn-more" title="更多" aria-label="更多操作" @click="toggleMenu(`saved-${stored.id}`)">⋮</button>
                  <div class="dropdown-menu" :class="{ 'is-open': openMenuId === `saved-${stored.id}` }" @click.stop="closeMenu">
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

    <Teleport to="body">
      <div v-if="aiModalOpen" class="ai-modal-backdrop" @click.self="closeAiModal">
        <section class="ai-modal" role="dialog" aria-modal="true" aria-labelledby="ai-modal-title">
          <header class="ai-modal-header">
            <div>
              <span class="ai-modal-eyebrow">ASYNC REQUEST</span>
              <h2 id="ai-modal-title">AI 智能分组</h2>
              <p>{{ aiProgressMessage }}</p>
            </div>
            <button class="btn-sm ai-modal-close" type="button" :disabled="aiGrouping" aria-label="关闭" @click="closeAiModal">×</button>
          </header>

          <div class="ai-modal-body">
            <ol class="ai-progress-steps">
              <li v-for="step in aiGroupingSteps" :key="step.id" :class="step.state">
                <span class="ai-step-indicator" aria-hidden="true">{{ step.state === 'done' ? '✓' : step.order }}</span>
                <span>{{ step.label }}</span>
              </li>
            </ol>

            <section v-if="aiReasoningContent" class="ai-event-panel ai-reasoning-panel" aria-label="思考过程">
              <button
                class="ai-panel-toggle"
                type="button"
                :aria-expanded="aiReasoningExpanded"
                @click="aiReasoningExpanded = !aiReasoningExpanded"
              >
                <span>思考过程</span>
                <span class="ai-panel-toggle-meta">{{ aiReasoningContent.length }} 字符 · {{ aiReasoningExpanded ? '收起' : '展开' }}</span>
              </button>
              <pre v-show="aiReasoningExpanded" ref="reasoningPreEl" :class="{ 'ai-typing': isAiReasoningTyping }">{{ aiReasoningTypedText }}</pre>
            </section>

            <section class="ai-stream-panel" aria-label="实时消息">
              <div class="ai-stream-title"><span>实时消息</span><span class="ai-stream-dot" aria-hidden="true"></span></div>
              <pre ref="streamPreEl" :class="{ 'ai-typing': isAiTyping }">{{ aiTypedText || '等待模型输出…' }}</pre>
            </section>

            <section class="ai-event-panel" aria-label="处理事件">
              <h3>处理事件</h3>
              <ul>
                <li v-for="event in aiEventLog" :key="event.id">
                  <time>{{ event.time }}</time><span>{{ event.message }}</span>
                </li>
              </ul>
            </section>
          </div>

          <footer class="ai-modal-footer">
            <span v-if="aiGroupingStatus" class="ai-grouping-status" :class="aiGroupingStatus.type" role="status">{{ aiGroupingStatus.message }}</span>
            <button v-else class="btn-ghost" type="button" disabled>处理中…</button>
            <button v-if="!aiGrouping" class="btn-primary" type="button" @click="closeAiModal">完成</button>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { NSelect } from 'naive-ui'
import { useTabs } from '../shared/useTabs.js'
import { useCollects } from '../shared/useCollects.js'
import {
  activateTab as activateTabApi,
  closeTab as closeTabApi,
  reloadTab as reloadTabApi,
  pinTab as pinTabApi,
  muteTab as muteTabApi,
  duplicateTab as duplicateTabApi,
  moveTab as moveTabApi,
  createTab,
  createTabGroup,
  DEFAULT_FAVICON,
} from '../shared/api.js'
import { requestAiTabGroups } from '../shared/aiTabGrouping.js'

const {
  tabs,
  tabGroups,
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
  addTabsToCollect,
  removeTabFromCollect,
  moveTabInCollect,
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
const savingWindowId = ref(null)
const windowCollectValue = ref(null)

// 拖拽状态
const dragOverCollectId = ref(null)
const dragTabData = ref(null)
const draggingTabId = ref(null)
const dragOverTabId = ref(null)
const dragOverPosition = ref(null)
const openMenuId = ref(null)
const selectedTabs = ref(new Map())
const aiGrouping = ref(false)
const aiGroupingStatus = ref(null)
const aiProgressMessage = ref('正在准备需要整理的标签…')
const aiGroupingSteps = ref([])
const aiModalOpen = ref(false)
const aiStreamContent = ref('')
const aiReasoningContent = ref('')
const aiEventLog = ref([])
const aiChunkStats = ref({ chunks: 0, chars: 0 })
const aiReasoningExpanded = ref(true)
const streamPreEl = ref(null)
const reasoningPreEl = ref(null)
const aiTypedCount = ref(0)
const aiReasoningTypedCount = ref(0)
let aiTypeTimer = null

const aiTypedText = computed(() => aiStreamContent.value.slice(0, aiTypedCount.value))
const isAiTyping = computed(() => aiTypedCount.value < aiStreamContent.value.length)
const aiReasoningTypedText = computed(() => aiReasoningContent.value.slice(0, aiReasoningTypedCount.value))
const isAiReasoningTyping = computed(() => aiReasoningTypedCount.value < aiReasoningContent.value.length)

// 打字机效果：按固定节奏把已接收的流内容逐字符显示出来，大段积压时自动加速追平。
function advanceTypewriter(target, typed) {
  const total = target.value.length
  if (typed.value >= total) return false
  const remaining = total - typed.value
  typed.value = Math.min(total, typed.value + Math.max(2, Math.ceil(remaining / 80)))
  return true
}

function startTypewriter() {
  if (aiTypeTimer) return
  aiTypeTimer = setInterval(() => {
    const hasReasoning = advanceTypewriter(aiReasoningContent, aiReasoningTypedCount)
    const hasContent = advanceTypewriter(aiStreamContent, aiTypedCount)
    if (!hasReasoning && !hasContent && !aiGrouping.value) stopTypewriter()
  }, 16)
}

function stopTypewriter() {
  if (!aiTypeTimer) return
  clearInterval(aiTypeTimer)
  aiTypeTimer = null
}

// 流式输出时让内容面板、打字面板与思考面板始终滚动到底部。
watch([aiStreamContent, aiTypedText, aiReasoningTypedText], async () => {
  await nextTick()
  if (streamPreEl.value) streamPreEl.value.scrollTop = streamPreEl.value.scrollHeight
  if (reasoningPreEl.value) reasoningPreEl.value.scrollTop = reasoningPreEl.value.scrollHeight
})

onMounted(() => {
  initCollects()
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
  stopTypewriter()
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

const aiGroupingCandidates = computed(() => tabs.value.filter((tab) => tab.groupId === -1 && !tab.pinned))

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

const TAB_GROUP_COLORS = {
  grey: '#7b8794',
  blue: '#4a9eff',
  red: '#ef5b5b',
  yellow: '#d99a00',
  green: '#28a66a',
  pink: '#dd6d9e',
  purple: '#8a6ee8',
  cyan: '#17a7b8',
  orange: '#e98336',
}

function tabGroupColor(color) {
  return TAB_GROUP_COLORS[color] || TAB_GROUP_COLORS.grey
}

const tabGroupsById = computed(() => new Map(tabGroups.value.map((group) => [group.id, group])))

function tabGroupInfo(tab) {
  const group = tabGroupsById.value.get(tab.groupId)
  if (!group) return null
  return { title: group.title || '未命名标签组', color: tabGroupColor(group.color) }
}

function tabGroupStyle(tab) {
  const group = tabGroupInfo(tab)
  return group ? { '--tab-group-color': group.color } : null
}

const savableCollects = computed(() => collects.value.filter((collect) => !isDefault(collect.id)))

const collectOptions = computed(() => savableCollects.value.map((collect) => ({
  label: collect.name,
  value: `collect:${collect.id}`,
})))

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

async function openCollectInCurrentWindow(coll) {
  const result = await chrome.storage.sync.get('settings')
  const openMode = result.settings?.collectOpenMode || 'group'
  const currentWindow = await chrome.windows.getCurrent()
  const openedTabs = await Promise.all(
    coll.tabs.map((tab) => createTab(tab.url, { active: false, windowId: currentWindow.id }))
  )

  if (openMode === 'group' && openedTabs.length > 0) {
    await createTabGroup(openedTabs.map((tab) => tab.id), coll.name)
  }
}

async function groupDefaultTabsWithAi() {
  aiGroupingStatus.value = null
  aiGrouping.value = true
  aiModalOpen.value = true
  aiStreamContent.value = ''
  aiReasoningContent.value = ''
  aiEventLog.value = []
  aiChunkStats.value = { chunks: 0, chars: 0 }
  aiReasoningExpanded.value = true
  aiTypedCount.value = 0
  aiReasoningTypedCount.value = 0
  aiProgressMessage.value = '正在准备需要整理的标签…'
  aiGroupingSteps.value = [
    { id: 'preparing', order: 1, label: '准备标签上下文', state: 'active' },
    { id: 'requesting', order: 2, label: '请求 AI 生成 JSON 分组方案', state: 'pending' },
    { id: 'validating', order: 3, label: '校验 AI 返回的数据', state: 'pending' },
    { id: 'creating', order: 4, label: '创建 Chrome 标签组', state: 'pending' },
  ]
  addAiEvent('已开始整理 Default 中的标签。')
  try {
    const groups = await requestAiTabGroups(aiGroupingCandidates.value, {
      onProgress: updateAiGroupingProgress,
      onResult: handleAiResult,
      onChunk: handleAiChunk,
    })
    if (!groups.length) {
      aiGroupingStatus.value = { type: 'info', message: 'AI 未建议可创建的分组。' }
      return
    }

    updateAiGroupingProgress('creating', `正在创建 1/${groups.length} 个 Chrome 标签组…`)
    for (const [index, group] of groups.entries()) {
      await createTabGroup(group.tabIds, group.name, group.color)
      addAiEvent(`已创建「${group.name}」标签组（${group.tabIds.length} 个标签）。`)
      if (index + 1 < groups.length) {
        updateAiGroupingProgress('creating', `正在创建 ${index + 2}/${groups.length} 个 Chrome 标签组…`)
      }
    }
    await refresh()
    aiGroupingSteps.value = aiGroupingSteps.value.map((step) => ({ ...step, state: 'done' }))
    aiGroupingStatus.value = { type: 'success', message: `已创建 ${groups.length} 个 AI 标签组。` }
    addAiEvent('标签页已刷新，AI 分组完成。')
  } catch (error) {
    aiGroupingStatus.value = { type: 'error', message: error.message || 'AI 分组失败。' }
    addAiEvent(`处理失败：${error.message || '未知错误'}`)
  } finally {
    aiGrouping.value = false
  }
}

function updateAiGroupingProgress(stage, message) {
  const labels = {
    preparing: '正在准备需要整理的标签…',
    requesting: 'AI 正在分析标签主题并生成 JSON 分组方案…',
    validating: '正在验证 AI 返回的 JSON 数据…',
    creating: '正在创建 Chrome 标签组…',
  }
  aiProgressMessage.value = message || labels[stage]
  const activeIndex = aiGroupingSteps.value.findIndex((step) => step.id === stage)
  if (activeIndex < 0) return
  const wasActive = aiGroupingSteps.value[activeIndex].state === 'active'
  aiGroupingSteps.value = aiGroupingSteps.value.map((step, index) => ({
    ...step,
    state: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending',
  }))
  if (!wasActive || message) addAiEvent(aiProgressMessage.value)
}

function handleAiChunk(chunk) {
  aiChunkStats.value = { chunks: aiChunkStats.value.chunks + 1, chars: chunk.content.length }
  if (chunk.reasoning) {
    aiReasoningContent.value = chunk.reasoning
    startTypewriter()
  }
  if (chunk.content) {
    aiStreamContent.value = chunk.content
    startTypewriter()
  }
}

function handleAiResult(content) {
  aiStreamContent.value = content
  addAiEvent(`已收到完整响应（${aiChunkStats.value.chunks} 个 chunk，${aiChunkStats.value.chars} 字符），开始解析 JSON。`)
}

function addAiEvent(message) {
  aiEventLog.value.push({
    id: `${Date.now()}-${aiEventLog.value.length}`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    message,
  })
}

function closeAiModal() {
  if (!aiGrouping.value) {
    stopTypewriter()
    aiModalOpen.value = false
  }
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

function startWindowCollect(win) {
  savingWindowId.value = win.windowId
  windowCollectValue.value = null
}

async function saveWindowAsCollect(win) {
  const value = windowCollectValue.value
  if (!value) return
  const snapshots = win.tabs.map(({ id, title, url, favIconUrl }) => ({ id, title, url, favIconUrl }))
  if (value.startsWith('collect:')) {
    await addTabsToCollect(value.slice('collect:'.length), snapshots)
  } else {
    await addCollect(value.slice('new:'.length), snapshots)
  }
  await Promise.all(win.tabs.map((tab) => closeTabApi(tab.id)))
  await refresh()
  cancelWindowCollect()
}

function cancelWindowCollect() {
  savingWindowId.value = null
  windowCollectValue.value = null
}

function createCollectOption(label) {
  const name = label.trim()
  if (!name) return null
  const existing = savableCollects.value.find((collect) => collect.name === name)
  return existing
    ? { label: existing.name, value: `collect:${existing.id}` }
    : { label: name, value: `new:${name}` }
}

function startRename(coll) {
  closeMenu()
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
  closeMenu()
  if (confirm(`确定删除收藏集「${coll.name}」？`)) {
    removeCollect(coll.id)
  }
}

function selectCollect(collectId) {
  selectedCollectId.value = collectId
  closeMenu()
}

function toggleCollectMenu(collectId) {
  toggleMenu(`collect-${collectId}`)
}

function toggleMenu(menuId) {
  openMenuId.value = openMenuId.value === menuId ? null : menuId
}

function closeMenu() {
  openMenuId.value = null
}

function tabSelectionKey(tab, sourceCollectId) {
  return `${sourceCollectId}:${tab.id}`
}

function isTabSelected(tab, sourceCollectId) {
  return selectedTabs.value.has(tabSelectionKey(tab, sourceCollectId))
}

function toggleTabSelection(tab, sourceCollectId) {
  const key = tabSelectionKey(tab, sourceCollectId)
  const next = new Map(selectedTabs.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.set(key, {
      id: tab.id,
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      windowId: tab.windowId,
      index: tab.index,
      sourceCollectId,
    })
  }
  selectedTabs.value = next
}

function clearTabSelection() {
  selectedTabs.value = new Map()
}

// ---- 拖拽 ----

function onDragStart(e, tab, sourceCollectId) {
  const currentTab = {
    id: tab.id,
    title: tab.title,
    url: tab.url,
    favIconUrl: tab.favIconUrl,
    windowId: tab.windowId,
    index: tab.index,
    sourceCollectId,
  }
  const selectedFromSource = [...selectedTabs.value.values()].filter(
    (selected) => selected.sourceCollectId === sourceCollectId
  )
  dragTabData.value = {
    sourceCollectId,
    tabs: isTabSelected(tab, sourceCollectId) ? selectedFromSource : [currentTab],
  }
  draggingTabId.value = tab.id
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(tab.id))
}

function onDragEnd() {
  dragOverCollectId.value = null
  dragTabData.value = null
  draggingTabId.value = null
  dragOverTabId.value = null
  dragOverPosition.value = null
}

function canDropOnCard(targetTab) {
  const sourceTab = dragTabData.value?.tabs?.[0]
  if (!sourceTab || dragTabData.value.tabs.length !== 1 || sourceTab.id === targetTab.id) return false
  return (
    (sourceTab.sourceCollectId === DEFAULT_COLLECT_ID && isDefault(selectedCollectId.value)) ||
    (sourceTab.sourceCollectId === selectedCollectId.value && !isDefault(selectedCollectId.value))
  )
}

function updateCardDropPosition(e, targetTab) {
  if (!canDropOnCard(targetTab)) return
  const bounds = e.currentTarget.getBoundingClientRect()
  dragOverTabId.value = targetTab.id
  dragOverPosition.value = e.clientY > bounds.top + bounds.height / 2 ? 'after' : 'before'
  dragOverCollectId.value = null
}

function onCardDragEnter(e, targetTab) {
  updateCardDropPosition(e, targetTab)
}

function onCardDragOver(e, targetTab) {
  e.dataTransfer.dropEffect = 'move'
  updateCardDropPosition(e, targetTab)
}

function tabDragClasses(tab) {
  return {
    dragging: draggingTabId.value === tab.id,
    'is-pinned': Boolean(tab.pinned),
    'has-tab-group': Boolean(tabGroupInfo(tab)),
    'drag-target-before': dragOverTabId.value === tab.id && dragOverPosition.value === 'before',
    'drag-target-after': dragOverTabId.value === tab.id && dragOverPosition.value === 'after',
  }
}

async function onCardDrop(e, targetTab) {
  const sourceTab = dragTabData.value?.tabs?.[0]
  onDragEnd()

  if (!sourceTab || sourceTab.id === targetTab.id) return
  const bounds = e.currentTarget.getBoundingClientRect()
  const placeAfter = e.clientY > bounds.top + bounds.height / 2

  // 实时标签页可在窗口内或窗口间重排；收藏集只允许在同一收藏集内排序。
  if (sourceTab.sourceCollectId === DEFAULT_COLLECT_ID && isDefault(selectedCollectId.value)) {
    let targetIndex = targetTab.index + (placeAfter ? 1 : 0)
    if (sourceTab.windowId === targetTab.windowId && sourceTab.index < targetIndex) targetIndex -= 1
    await moveTabApi(sourceTab.id, targetTab.windowId, targetIndex)
    await refresh()
  } else if (sourceTab.sourceCollectId === selectedCollectId.value && !isDefault(selectedCollectId.value)) {
    await moveTabInCollect(selectedCollectId.value, sourceTab.id, targetTab.id, placeAfter)
  }
}

function canDropOnCollect(collectId) {
  const sourceCollectId = dragTabData.value?.sourceCollectId
  return (
    (sourceCollectId === DEFAULT_COLLECT_ID && !isDefault(collectId)) ||
    (sourceCollectId && sourceCollectId !== collectId)
  )
}

function setCollectDropTarget(collectId) {
  if (!canDropOnCollect(collectId)) return
  dragOverCollectId.value = collectId
  dragOverTabId.value = null
  dragOverPosition.value = null
}

function onDragOver(collectId) {
  setCollectDropTarget(collectId)
}

function onDragEnter(collectId) {
  setCollectDropTarget(collectId)
}

async function onDrop(collectId) {
  dragOverCollectId.value = null
  const tabData = dragTabData.value
  onDragEnd()
  if (!tabData?.tabs?.length) return

  // 收藏集内的保存项拖回 Default：在当前窗口打开，并从原收藏集中移除。
  if (tabData.sourceCollectId !== DEFAULT_COLLECT_ID && isDefault(collectId)) {
    await Promise.all(tabData.tabs.map((tab) => createTab(tab.url, { active: false })))
    await Promise.all(tabData.tabs.map((tab) => removeTabFromCollect(tabData.sourceCollectId, tab.id)))
    clearTabSelection()
    return
  }

  // 收藏集之间移动：先加入目标收藏集，再移除原收藏集中的保存项。
  if (tabData.sourceCollectId !== DEFAULT_COLLECT_ID && !isDefault(collectId)) {
    await addTabsToCollect(collectId, tabData.tabs)
    await Promise.all(tabData.tabs.map((tab) => removeTabFromCollect(tabData.sourceCollectId, tab.id)))
    clearTabSelection()
    return
  }

  // 实时标签页可拖入非 Default 收藏集保存并关闭原标签页。
  if (tabData.sourceCollectId !== DEFAULT_COLLECT_ID || isDefault(collectId)) return

  // 保存到收藏集
  await addTabsToCollect(collectId, tabData.tabs)

  // 非 Default 且是实时标签页则关闭
  if (!isDefault(collectId)) {
    try {
      await Promise.all(tabData.tabs.map((tab) => closeTabApi(tab.id)))
    } catch {
      // 标签页可能已关闭
    }
  }
  clearTabSelection()
}
</script>

<style scoped>
.tabs-page {
  display: flex;
  flex-direction: column;
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

.header-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
}

.header-icon-button svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.9;
}

/* ===== 左右布局 ===== */
.main-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 20px;
  align-items: stretch;
}

/* 左侧栏 */
.sidebar {
  display: flex;
  flex-direction: column;
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
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.collect-item {
  display: flex;
  align-items: center;
  height: 45px;
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
  background: color-mix(in srgb, var(--accent-light) 72%, transparent);
  color: var(--accent);
  box-shadow: inset 0 0 0 1px rgba(74, 158, 255, 0.58);
}

.collect-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.collect-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.collect-name {
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collect-default-name {
  color: #6b7280;
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
  gap: 4px;
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

.ai-group-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.ai-grouping-notice {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin: -10px 0 16px;
  color: var(--text-secondary);
  font-size: 12px;
}

.ai-grouping-status {
  font-weight: 600;
}

.ai-grouping-status.success {
  color: #1a9e4a;
}

.ai-grouping-status.error {
  color: var(--danger);
}

.ai-grouping-status.info {
  color: var(--text-secondary);
}

.ai-modal-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(22, 35, 54, 0.36);
  backdrop-filter: blur(4px);
}

.ai-modal {
  display: flex;
  flex-direction: column;
  width: min(760px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid rgba(74, 158, 255, 0.46);
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(22, 35, 54, 0.24);
  animation: ai-modal-enter 0.22s ease-out;
}

.ai-modal-header,
.ai-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 16px;
  padding: 18px 22px;
}

.ai-modal-header {
  background: linear-gradient(120deg, var(--accent-light), var(--bg-card) 72%);
  border-bottom: 1px solid var(--border);
}

.ai-modal-header h2 {
  margin-top: 2px;
  font-size: 18px;
}

.ai-modal-header p {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.ai-modal-eyebrow {
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.ai-modal-close {
  width: 30px;
  height: 30px;
  font-size: 20px;
}

.ai-modal-body {
  display: grid;
  flex: 1;
  align-content: start;
  gap: 16px;
  min-height: 0;
  padding: 20px 22px;
  overflow-y: auto;
}

.ai-progress-steps {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ai-progress-steps li {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 28px;
  color: var(--text-secondary);
  font-size: 13px;
}

.ai-step-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--bg-card);
  font-size: 11px;
}

.ai-progress-steps li.active,
.ai-progress-steps li.done {
  color: var(--text-primary);
}

.ai-progress-steps li.done .ai-step-indicator,
.ai-progress-steps li.active .ai-step-indicator {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.ai-progress-steps li.active .ai-step-indicator {
  animation: ai-step-pulse 1.15s ease-in-out infinite;
}

.ai-stream-panel,
.ai-event-panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
}

.ai-stream-title,
.ai-event-panel h3 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.ai-panel-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
  padding: 9px 12px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.ai-panel-toggle:hover {
  color: var(--accent);
  background: var(--bg-hover);
}

.ai-panel-toggle-meta {
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

.ai-panel-toggle[aria-expanded='false'] {
  border-bottom: 0;
}

.ai-stream-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
  animation: ai-step-pulse 1.15s ease-in-out infinite;
}

.ai-stream-panel pre,
.ai-event-panel pre {
  min-height: 96px;
  max-height: 190px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  color: #25405f;
  font: 12px/1.55 ui-monospace, SFMono-Regular, Consolas, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.ai-typing::after {
  content: '▍';
  margin-left: 1px;
  color: var(--accent);
  animation: ai-caret-blink 0.9s steps(1) infinite;
}

@keyframes ai-caret-blink {
  50% { opacity: 0; }
}

.ai-event-panel ul {
  display: grid;
  gap: 8px;
  max-height: 140px;
  margin: 0;
  padding: 10px 12px;
  overflow-y: auto;
  list-style: none;
}

.ai-event-panel li {
  display: flex;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}

.ai-event-panel time {
  flex-shrink: 0;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.ai-modal-footer {
  min-height: 62px;
  border-top: 1px solid var(--border);
}

@keyframes ai-modal-enter {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes ai-step-pulse {
  50% { transform: scale(1.13); box-shadow: 0 0 0 5px rgba(74, 158, 255, 0.14); }
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

.window-collect-button {
  padding: 5px 10px;
  font-size: 12px;
}

.window-collect-form {
  display: flex;
  align-items: center;
  gap: 4px;
}

.window-collect-select {
  width: 220px;
}

.window-collect-form .btn-sm {
  width: 26px;
  height: 26px;
  padding: 0;
  font-size: 15px;
}

.window-collect-confirm {
  color: var(--success);
}

.window-collect-cancel {
  color: var(--text-secondary);
}

.tab-card.has-tab-group {
  border-color: color-mix(in srgb, var(--tab-group-color) 48%, var(--border));
  background: linear-gradient(90deg, color-mix(in srgb, var(--tab-group-color) 9%, var(--bg-card)), var(--bg-card) 42%);
  box-shadow: inset 3px 0 0 var(--tab-group-color), var(--shadow);
}

.tab-group-chip {
  display: inline-flex;
  align-items: center;
  max-width: 96px;
  gap: 4px;
  padding: 2px 6px;
  overflow: hidden;
  border-radius: 10px;
  background: color-mix(in srgb, var(--tab-group-color) 13%, transparent);
  color: color-mix(in srgb, var(--tab-group-color) 82%, var(--text-primary));
  font-size: 10px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-group-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--tab-group-color);
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

.tab-select-control {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
}

.tab-select-control .favicon {
  transition: opacity 0.15s ease;
}

.tab-select-checkbox {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1px solid var(--text-secondary);
  border-radius: 4px;
  background: var(--bg-card);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.tab-select-control:hover .favicon,
.tab-select-control:focus-visible .favicon,
.tab-select-control.is-selected .favicon {
  opacity: 0;
}

.tab-select-control:hover .tab-select-checkbox,
.tab-select-control:focus-visible .tab-select-checkbox,
.tab-select-control.is-selected .tab-select-checkbox {
  opacity: 1;
}

.tab-select-control.is-selected .tab-select-checkbox {
  border-color: var(--accent);
  background: var(--accent);
}

.tab-card.is-selected {
  border-color: #b8c2cc;
  background: #f3f5f7;
  box-shadow: 0 0 0 2px rgba(107, 122, 143, 0.16), var(--shadow);
}

.tab-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.tab-card.is-pinned {
  background: linear-gradient(90deg, rgba(74, 158, 255, 0.18), var(--bg-card) 42%);
  border-color: rgba(74, 158, 255, 0.42);
  box-shadow: inset 3px 0 0 var(--accent), var(--shadow);
}

.tab-card.is-pinned.is-selected {
  background: #f3f5f7;
  box-shadow: inset 3px 0 0 var(--accent), 0 0 0 2px rgba(107, 122, 143, 0.16), var(--shadow);
}

.tab-pinned-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.tab-pinned-indicator svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.9;
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

/* 收藏集与标签卡的操作均为纯图标按钮；用底色提示悬停，避免边框显得生硬。 */
.collect-actions .btn-sm,
.tab-actions .btn-sm {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 5px;
  font-size: 16px;
}

.collect-actions .btn-sm:hover,
.tab-actions .btn-sm:hover {
  background: var(--accent-light);
  border-color: transparent;
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

.dropdown-menu.is-open {
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

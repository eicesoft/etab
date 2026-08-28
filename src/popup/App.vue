<template>
  <div class="popup-container">
    <!-- 头部 -->
    <header class="popup-header">
      <h1 class="logo">eTab</h1>
      <span class="badge badge-primary">{{ tabs.length }}</span>
      <div class="header-actions">
        <button class="btn-icon" @click="openTabsPage" title="Open Tabs Manager">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
        <button class="btn-icon" @click="openOptions" title="Options">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.5 2.5l1.5 1.5M12 12l1.5 1.5M2.5 13.5l1.5-1.5M12 4l1.5-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="btn-icon" @click="refresh" title="Refresh">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M13 8a5 5 0 0 1-9.9 1M3 8a5 5 0 0 1 9.9-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M13 3v3h-3M3 13v-3h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- 搜索 -->
    <div class="search-bar">
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search tabs..."
      />
    </div>

    <!-- 加载 -->
    <div v-if="loading" class="loading-spinner">Loading...</div>

    <!-- 空状态 -->
    <div v-else-if="filteredTabs.length === 0" class="empty-state">
      <div class="icon">📑</div>
      <p>No tabs found</p>
    </div>

    <!-- 标签列表 -->
    <div v-else class="tab-list">
      <div
        v-for="tab in filteredTabs"
        :key="tab.id"
        class="tab-card"
        @click="activateTab(tab)"
      >
        <img
          class="favicon"
          :src="tab.favIconUrl || defaultFavicon"
          alt=""
          @error="onFaviconError"
        />
        <div class="tab-info">
          <div class="tab-title">{{ tab.title }}</div>
          <div class="tab-url">{{ tab.url }}</div>
        </div>
        <div class="tab-actions">
          <button
            class="btn-ghost"
            title="Close"
            @click.stop="closeTab(tab)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTabs } from '../shared/useTabs.js'
import {
  closeTab as closeTabApi,
  DEFAULT_FAVICON,
} from '../shared/api.js'

const { tabs, loading, refresh } = useTabs()
const searchQuery = ref('')
const defaultFavicon = DEFAULT_FAVICON()

const filteredTabs = computed(() => {
  if (!searchQuery.value) return tabs.value
  const q = searchQuery.value.toLowerCase()
  return tabs.value.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.url.toLowerCase().includes(q)
  )
})

function onFaviconError(e) {
  e.target.src = defaultFavicon
}

async function activateTab(tab) {
  try {
    await chrome.runtime.sendMessage({
      type: 'ACTIVATE_TAB',
      tabId: tab.id,
      windowId: tab.windowId,
    })
  } catch (e) {
    // 备用：直接激活
    await chrome.tabs.update(tab.id, { active: true })
  }
  window.close()
}

async function closeTab(tab) {
  await closeTabApi(tab.id)
}

function openTabsPage() {
  chrome.tabs.create({ url: 'src/tabs/index.html' })
  window.close()
}

function openOptions() {
  chrome.runtime.openOptionsPage()
  window.close()
}
</script>

<style scoped>
.popup-container {
  width: 380px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  padding: 14px;
  gap: 10px;
  background: var(--bg-primary);
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo {
  font-size: 16px;
  font-weight: 700;
  color: var(--accent);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--accent);
  border-color: var(--border);
}

.tab-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
}

.tab-info {
  flex: 1;
  min-width: 0;
}

.tab-title {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-url {
  font-size: 10px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>
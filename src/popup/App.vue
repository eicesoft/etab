<template>
  <div v-motion class="popup-container" :initial="{ opacity: 0, y: 6 }" :enter="{ opacity: 1, y: 0, transition: { duration: 160 } }">
    <header class="popup-header">
      <h1 class="logo">eTab</h1><span class="badge badge-primary">{{ tabs.length }}</span>
      <div class="header-actions">
        <button class="btn-icon" title="打开标签页管理器" aria-label="打开标签页管理器" @click="openTabsPage"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg></button>
        <button class="btn-icon" title="设置" aria-label="设置" @click="openOptions"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg></button>
        <button class="btn-icon" title="刷新" aria-label="刷新" @click="refreshAll"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" /></svg></button>
      </div>
    </header>
    <div class="search-bar"><input v-model="searchQuery" type="search" placeholder="搜索标签页..." /></div>
    <div v-if="pageLoading" class="loading-spinner">加载中...</div>
    <NCollapse v-else v-model:expanded-names="expandedCollectIds" class="collect-collapse">
      <NCollapseItem v-for="panel in collectPanels" :key="panel.id" :name="panel.id">
        <template #header>
          <div class="collect-header">
            <svg v-if="panel.isDefault" class="collect-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M3.5 9h17M7 6.75h.01M10 6.75h.01" /></svg>
            <svg v-else class="collect-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5c0-1.1.9-2 2-2h4l1.7 2H18.5c1.1 0 2 .9 2 2v7c0 1.1-.9 2-2 2h-13c-1.1 0-2-.9-2-2v-9Z" /><path d="M3.5 10.5h17" /></svg>
            <span class="collect-name" :class="{ 'collect-default-name': panel.isDefault }">{{ panel.name }}</span><span class="collect-count">{{ panel.tabs.length }}</span>
            <span class="collect-actions" @click.stop>
              <button v-if="!panel.isDefault" title="在当前窗口打开" aria-label="在当前窗口打开" @click="openInCurrentWindow(panel)"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M9 12h6M12 9v6" /></svg></button>
              <button v-if="!panel.isDefault" title="在新窗口打开" aria-label="在新窗口打开" @click="openInNewWindow(panel)"><svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="11" height="11" rx="2" /><rect x="9.5" y="9.5" width="11" height="11" rx="2" /></svg></button>
              <button v-if="!panel.isDefault" title="在隐私窗口打开" aria-label="在隐私窗口打开" @click="openInIncognitoWindow(panel)"><svg viewBox="0 0 24 24"><path d="M3 13h18" /><path d="M6 13a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4" /><circle cx="9" cy="16.5" r="1.4" /><circle cx="15" cy="16.5" r="1.4" /></svg></button>
            </span>
          </div>
        </template>
        <div v-if="panel.tabs.length" class="tab-icon-grid">
          <NTooltip v-for="tab in panel.tabs" :key="tab.id" placement="bottom" :delay="300">
            <template #trigger>
              <button class="tab-icon-button" :class="{ 'is-pinned': tab.pinned }" :aria-label="tab.title" @click="panel.isDefault ? activateTab(tab) : openSavedTab(tab)" @contextmenu.prevent.stop="openContextMenu($event, tab, panel)">
                <img :src="tab.favIconUrl || defaultFavicon" alt="" @error="onFaviconError" />
              </button>
            </template>
            <div class="tab-tooltip"><strong>{{ tab.title }}</strong><span>{{ tab.url }}</span></div>
          </NTooltip>
        </div>
        <p v-else class="empty-collect">暂无标签页</p>
      </NCollapseItem>
    </NCollapse>
    <Teleport to="body">
      <div v-if="contextMenu.visible" ref="menuRef" class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }" @click.stop="closeContextMenu" @contextmenu.prevent>
        <template v-if="contextMenu.isDefault">
          <button @click="pinCurrentTab">{{ contextMenu.tab.pinned ? '取消固定' : '固定标签页' }}</button>
          <button @click="muteCurrentTab">{{ contextMenu.tab.muted ? '取消静音' : '静音标签页' }}</button>
          <button @click="duplicateCurrentTab">复制标签页</button>
          <template v-if="menuCollects.length">
            <div class="context-menu-divider" />
            <button v-for="coll in menuCollects" :key="coll.id" @click="addCurrentTabToCollect(coll)">➕ 加入「{{ coll.name }}」</button>
          </template>
          <div class="context-menu-divider" />
          <button class="danger" @click="closeCurrentTab">关闭标签页</button>
        </template>
        <template v-else>
          <button @click="openSavedTab(contextMenu.tab)">打开标签页</button>
          <button @click="copySavedTabUrl">复制链接</button>
          <div class="context-menu-divider" />
          <button class="danger" @click="removeSavedTabFromCollect">移出收藏集</button>
        </template>
      </div>
      <Transition name="toast-fade">
        <div v-if="toast" class="toast">{{ toast }}</div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { NCollapse, NCollapseItem, NTooltip, useMessage } from 'naive-ui'
import { useTabs } from '../shared/useTabs.js'
import { useCollects } from '../shared/useCollects.js'
import { closeTab, createTab, createTabGroup, DEFAULT_FAVICON, duplicateTab, muteTab, pinTab } from '../shared/api.js'

const { tabs, loading: tabsLoading, refresh } = useTabs()
const { collects, loading: collectsLoading, init, isDefault, getAvailableCollects, addTabToCollect, removeTabFromCollect, DEFAULT_COLLECT_ID } = useCollects()
const searchQuery = ref('')
const expandedCollectIds = ref([DEFAULT_COLLECT_ID])
const defaultFavicon = DEFAULT_FAVICON()
const message = useMessage()
const pageLoading = computed(() => tabsLoading.value || collectsLoading.value)

const contextMenu = ref({ visible: false, x: 0, y: 0, tab: null, isDefault: false, collectId: null })
const menuRef = ref(null)
const toast = ref('')
let toastTimer = null

const menuCollects = computed(() =>
  contextMenu.value.isDefault && contextMenu.value.tab ? getAvailableCollects(contextMenu.value.tab.id) : []
)

onMounted(() => {
  init()
  document.addEventListener('click', closeContextMenu)
  document.addEventListener('contextmenu', closeContextMenu)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('contextmenu', closeContextMenu)
  document.removeEventListener('keydown', onKeydown)
})

const collectPanels = computed(() => collects.value.map((collect) => {
  const query = searchQuery.value.trim().toLowerCase()
  const source = isDefault(collect.id) ? tabs.value : collect.tabs
  const panelTabs = query ? source.filter((tab) => tab.title.toLowerCase().includes(query) || tab.url.toLowerCase().includes(query)) : source
  return { id: collect.id, name: collect.name, isDefault: isDefault(collect.id), tabs: panelTabs, allTabs: source }
}))

function onFaviconError(event) { event.target.src = defaultFavicon }
async function refreshAll() { await Promise.all([refresh(), init()]) }
async function activateTab(tab) {
  try { await chrome.runtime.sendMessage({ type: 'ACTIVATE_TAB', tabId: tab.id, windowId: tab.windowId }) }
  catch { await chrome.tabs.update(tab.id, { active: true }) }
  window.close()
}
async function openSavedTab(tab) { await chrome.tabs.create({ url: tab.url }); window.close() }

async function openContextMenu(event, tab, panel) {
  contextMenu.value = { visible: true, x: event.clientX, y: event.clientY, tab, isDefault: panel.isDefault, collectId: panel.id }
  await nextTick()
  if (!menuRef.value) return
  const x = Math.min(event.clientX, window.innerWidth - menuRef.value.offsetWidth - 6)
  const y = Math.min(event.clientY, window.innerHeight - menuRef.value.offsetHeight - 6)
  contextMenu.value.x = Math.max(4, x)
  contextMenu.value.y = Math.max(4, y)
}
function closeContextMenu() { contextMenu.value.visible = false }

function onKeydown(event) { if (event.key === 'Escape') closeContextMenu() }

async function pinCurrentTab() {
  await pinTab(contextMenu.value.tab.id, !contextMenu.value.tab.pinned)
  await refresh()
}

async function muteCurrentTab() {
  await muteTab(contextMenu.value.tab.id, !contextMenu.value.tab.muted)
  await refresh()
}

async function duplicateCurrentTab() {
  await duplicateTab(contextMenu.value.tab.id)
  await refresh()
}

async function closeCurrentTab() {
  await closeTab(contextMenu.value.tab.id)
  await refresh()
}

async function addCurrentTabToCollect(coll) {
  const tab = contextMenu.value.tab
  await addTabToCollect(coll.id, { id: tab.id, title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl })
  showToast(`已加入「${coll.name}」`)
}

async function copySavedTabUrl() {
  try {
    await navigator.clipboard.writeText(contextMenu.value.tab.url)
    showToast('已复制链接')
  } catch {
    showToast('复制失败')
  }
}

async function removeSavedTabFromCollect() {
  await removeTabFromCollect(contextMenu.value.collectId, contextMenu.value.tab.id)
}

function showToast(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2000)
}

async function openInCurrentWindow(panel) {
  const currentWindow = await chrome.windows.getCurrent()
  await openCollectionInWindow(panel, currentWindow.id)
}

async function openInNewWindow(panel) {
  if (!panel.allTabs.length) return message.info('该收藏集暂无标签页')
  const created = await chrome.windows.create({})
  if (typeof created.id !== 'number') throw new Error('新窗口创建失败')
  const blankTabs = await chrome.tabs.query({ windowId: created.id })
  const openedTabs = await Promise.all(
    panel.allTabs.map((tab) => createTab(tab.url, { active: false, windowId: created.id }))
  )
  await Promise.all(blankTabs.map((tab) => chrome.tabs.remove(tab.id)))
  await groupTabsIfConfigured(panel, openedTabs)
}

async function openInIncognitoWindow(panel) {
  if (!panel.allTabs.length) return message.info('该收藏集暂无标签页')
  try {
    const created = await chrome.windows.create({ incognito: true, url: panel.allTabs[0].url })
    await Promise.all(panel.allTabs.slice(1).map((tab) => createTab(tab.url, { active: false, windowId: created.id })))
  } catch {
    message.error('无法打开隐私窗口，请在扩展设置中允许无痕模式')
  }
}

async function openCollectionInWindow(panel, windowId) {
  if (!panel.allTabs.length) return message.info('该收藏集暂无标签页')
  const createdTabs = await Promise.all(panel.allTabs.map((tab) => createTab(tab.url, { active: false, windowId })))
  await groupTabsIfConfigured(panel, createdTabs)
}

async function groupTabsIfConfigured(panel, tabsToGroup) {
  const settings = await chrome.storage.sync.get('settings')
  if ((settings.settings?.collectOpenMode || 'group') === 'group' && tabsToGroup.length) {
    await createTabGroup(tabsToGroup.map((tab) => tab.id), panel.name)
  }
}
function openTabsPage() { chrome.tabs.create({ url: 'src/tabs/index.html' }); window.close() }
function openOptions() { chrome.runtime.openOptionsPage(); window.close() }
</script>

<style scoped>
.popup-container { width: 380px; display: flex; flex-direction: column; gap: 10px; padding: 14px; background: var(--bg-primary); }
.popup-header, .header-actions, .collect-header { display: flex; align-items: center; gap: 8px; }
.logo { color: var(--accent); font-size: 16px; }.header-actions { margin-left: auto; gap: 2px; }
.btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); }.btn-icon:hover { background: var(--bg-hover); color: var(--accent); }.btn-icon svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
.collect-collapse :deep(.n-collapse-item__header) { min-height: 42px; padding: 0 4px; }.collect-collapse :deep(.n-collapse-item__header-main) { display: flex; align-items: center; min-width: 0; }.collect-collapse :deep(.n-collapse-item__content-inner) { padding: 8px 10px 10px; background: var(--bg-card); }
.collect-header { width: 100%; min-height: 42px; }.collect-icon { width: 17px; height: 17px; flex-shrink: 0; fill: none; stroke: var(--text-secondary); stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }.collect-name { min-width: 0; max-width: 155px; overflow: hidden; font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }.collect-default-name { color: #6b7280; }.collect-count { flex-shrink: 0; padding: 1px 6px; border-radius: 9px; background: var(--bg-secondary); color: var(--text-secondary); font-size: 11px; }.collect-actions { display: inline-flex; margin-left: auto; gap: 2px; }.collect-actions button { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: 0; border-radius: 5px; background: transparent; color: var(--text-secondary); }.collect-actions button:hover { background: var(--accent-light); color: var(--accent); }.collect-actions svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
.tab-icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(32px, 1fr)); gap: 6px; }.tab-icon-button { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; border: 1px solid transparent; border-radius: 2px; background: var(--bg-secondary); }.tab-icon-button.is-pinned { border-color: #86bcf7; background: #cfe5ff; box-shadow: inset 2px 0 0 var(--accent); }.tab-icon-button:hover { border-color: var(--accent); background: var(--accent-light); transform: translateY(-1px); }.tab-icon-button img { width: 18px; height: 18px; }
.tab-tooltip { display: flex; max-width: 240px; flex-direction: column; gap: 3px; }.tab-tooltip strong, .tab-tooltip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.tab-tooltip span, .empty-collect { color: var(--text-secondary); font-size: 11px; }.empty-collect { margin: 0; padding: 4px 0; }
.context-menu { position: fixed; z-index: 3000; min-width: 168px; max-height: 60vh; overflow-y: auto; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1); padding: 4px; }
.context-menu button { display: block; width: 100%; padding: 6px 12px; font-size: 12px; text-align: left; border: 0; background: none; border-radius: 4px; cursor: pointer; }
.context-menu button:hover { background: var(--bg-hover); color: var(--accent); }
.context-menu button.danger { color: var(--danger); }
.context-menu button.danger:hover { background: var(--danger-light); }
.context-menu-divider { height: 1px; margin: 4px 8px; background: var(--border); }
.toast { position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%); z-index: 3001; background: var(--success); color: #fff; padding: 7px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; white-space: nowrap; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
</style>

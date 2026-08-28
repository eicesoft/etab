import { ref, computed } from 'vue'

/**
 * 收藏集管理 composable
 * 管理标签页分组收藏集，存储在 chrome.storage.local
 * 每个收藏集存储完整的标签页信息（id, title, url, favIconUrl）
 * 即使原始标签页关闭，收藏集内仍可查看
 */

const STORAGE_KEY = 'etab_collects'
const DEFAULT_COLLECT_ID = '__default__'

let cachedCollects = null

/**
 * 加载收藏集（带缓存），自动迁移旧数据格式
 */
async function loadCollects() {
  if (cachedCollects) return cachedCollects
  const result = await chrome.storage.local.get(STORAGE_KEY)
  let list = result[STORAGE_KEY] || []
  // 迁移旧格式：tabIds -> tabs
  list = migrateCollects(list)
  cachedCollects = list
  return list
}

/**
 * 迁移旧数据格式：将 tabIds: number[] 转换为 tabs: Array<{id, title, url, favIconUrl}>
 */
function migrateCollects(list) {
  let changed = false
  list = list.map((c) => {
    if (c.tabIds && Array.isArray(c.tabIds) && !c.tabs) {
      changed = true
      return { ...c, tabs: c.tabIds.map((id) => ({ id, title: '标签页 #' + id, url: '', favIconUrl: '' })), tabIds: undefined }
    }
    // 确保有 tabs 字段
    if (!c.tabs) {
      changed = true
      return { ...c, tabs: [] }
    }
    return c
  })
  if (changed) {
    // 异步保存，不阻塞
    chrome.storage.local.set({ [STORAGE_KEY]: list }).catch(() => {})
  }
  return list
}

/**
 * 保存收藏集并更新缓存
 */
async function saveCollects(list) {
  cachedCollects = list
  await chrome.storage.local.set({ [STORAGE_KEY]: list })
}

/**
 * 确保 Default 收藏集存在（Default 始终显示所有打开的标签页）
 */
function ensureDefault(list) {
  const has = list.some((c) => c.id === DEFAULT_COLLECT_ID)
  if (!has) {
    list.unshift({ id: DEFAULT_COLLECT_ID, name: 'Default', tabs: [] })
  }
  return list
}

/**
 * 生成短 id
 */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function useCollects() {
  const collects = ref([])
  const selectedCollectId = ref(DEFAULT_COLLECT_ID)
  const loading = ref(true)

  const selectedCollect = computed(() => {
    return collects.value.find((c) => c.id === selectedCollectId.value) || collects.value[0] || null
  })

  /**
   * 初始化：加载收藏集
   */
  async function init() {
    loading.value = true
    let list = await loadCollects()
    list = ensureDefault(list)
    collects.value = list
    if (!collects.value.find((c) => c.id === selectedCollectId.value)) {
      selectedCollectId.value = DEFAULT_COLLECT_ID
    }
    loading.value = false
  }

  /**
   * 创建新收藏集
   */
  async function addCollect(name) {
    const list = [...collects.value]
    list.push({ id: genId(), name, tabs: [] })
    collects.value = list
    await saveCollects(list)
    selectedCollectId.value = list[list.length - 1].id
  }

  /**
   * 重命名收藏集
   */
  async function renameCollect(id, name) {
    if (id === DEFAULT_COLLECT_ID) return
    const list = collects.value.map((c) => (c.id === id ? { ...c, name } : c))
    collects.value = list
    await saveCollects(list)
  }

  /**
   * 删除收藏集
   */
  async function removeCollect(id) {
    if (id === DEFAULT_COLLECT_ID) return
    const list = collects.value.filter((c) => c.id !== id)
    collects.value = list
    await saveCollects(list)
    if (selectedCollectId.value === id) {
      selectedCollectId.value = DEFAULT_COLLECT_ID
    }
  }

  /**
   * 向收藏集添加标签页（保存完整信息）
   * @param {string} collectId
   * @param {{id: number, title: string, url: string, favIconUrl: string}} tabInfo
   */
  async function addTabToCollect(collectId, tabInfo) {
    const list = collects.value.map((c) => {
      if (c.id === collectId) {
        const exists = c.tabs.some((t) => t.id === tabInfo.id)
        if (exists) return c
        return { ...c, tabs: [...c.tabs, { ...tabInfo }] }
      }
      return c
    })
    collects.value = list
    await saveCollects(list)
  }

  /**
   * 从收藏集移除标签页
   */
  async function removeTabFromCollect(collectId, tabId) {
    const list = collects.value.map((c) => {
      if (c.id === collectId) {
        return { ...c, tabs: c.tabs.filter((t) => t.id !== tabId) }
      }
      return c
    })
    collects.value = list
    await saveCollects(list)
  }

  /**
   * 判断是否为 Default 收藏集
   */
  function isDefault(id) {
    return id === DEFAULT_COLLECT_ID
  }

  /**
   * 获取某标签页已加入的收藏集列表
   */
  function getCollectsForTab(tabId) {
    return collects.value.filter((c) => c.tabs.some((t) => t.id === tabId))
  }

  /**
   * 获取某标签页尚未加入的收藏集（排除 Default 和已加入的）
   */
  function getAvailableCollects(tabId) {
    return collects.value.filter(
      (c) => !isDefault(c.id) && !c.tabs.some((t) => t.id === tabId)
    )
  }

  return {
    collects,
    selectedCollectId,
    selectedCollect,
    loading,
    init,
    addCollect,
    renameCollect,
    removeCollect,
    addTabToCollect,
    removeTabFromCollect,
    isDefault,
    getCollectsForTab,
    getAvailableCollects,
    DEFAULT_COLLECT_ID,
  }
}
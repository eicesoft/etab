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
  let changed = !Array.isArray(list)
  const validCollects = Array.isArray(list) ? list : []

  list = validCollects.reduce((result, collect) => {
    // 跳过无法渲染、也无法稳定持久化的损坏条目。
    if (!collect || typeof collect !== 'object' || !collect.id) {
      changed = true
      return result
    }

    let tabs = collect.tabs
    if (!Array.isArray(tabs)) {
      changed = true
      tabs = Array.isArray(collect.tabIds)
        ? collect.tabIds.map((id) => ({ id, title: '标签页 #' + id, url: '', favIconUrl: '' }))
        : []
    }

    if (collect.tabIds) changed = true
    result.push({ ...collect, tabs, tabIds: undefined })
    return result
  }, [])
  if (changed) {
    // 异步保存，不阻塞
    chrome.storage.local.set({ [STORAGE_KEY]: list }).catch(() => {})
  }
  return list
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
   * 在所有扩展页面之间串行化收藏集更新：每次都基于存储中的最新数据合并，
   * 防止独立页面的内存缓存相互覆盖。
   */
  async function updateCollects(mutator) {
    const commit = async () => {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      const current = ensureDefault(migrateCollects(result[STORAGE_KEY] || []))
      const next = mutator(current)
      cachedCollects = next
      collects.value = next
      await chrome.storage.local.set({ [STORAGE_KEY]: next })
      return next
    }

    if (globalThis.navigator?.locks?.request) {
      return globalThis.navigator.locks.request(STORAGE_KEY, { mode: 'exclusive' }, commit)
    }
    return commit()
  }

  /**
   * 创建新收藏集
   */
  async function addCollect(name, tabs = []) {
    const list = await updateCollects((current) => [
      ...current,
      { id: genId(), name, tabs },
    ])
    selectedCollectId.value = list[list.length - 1].id
  }

  /**
   * 重命名收藏集
   */
  async function renameCollect(id, name) {
    if (id === DEFAULT_COLLECT_ID) return
    await updateCollects((current) => current.map((c) => (c.id === id ? { ...c, name } : c)))
  }

  /**
   * 删除收藏集
   */
  async function removeCollect(id) {
    if (id === DEFAULT_COLLECT_ID) return
    await updateCollects((current) => current.filter((c) => c.id !== id))
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
    await updateCollects((current) => current.map((c) => {
      if (c.id === collectId) {
        const exists = c.tabs.some((t) => t.id === tabInfo.id)
        if (exists) return c
        return { ...c, tabs: [...c.tabs, { ...tabInfo }] }
      }
      return c
    }))
  }

  /** 向收藏集批量添加标签页，已存在的标签页会自动跳过。 */
  async function addTabsToCollect(collectId, tabInfos) {
    await updateCollects((current) => current.map((collect) => {
      if (collect.id !== collectId) return collect

      const tabIds = new Set(collect.tabs.map((tab) => tab.id))
      const newTabs = tabInfos.filter((tab) => !tabIds.has(tab.id))
      return newTabs.length ? { ...collect, tabs: [...collect.tabs, ...newTabs] } : collect
    }))
  }

  /**
   * 从收藏集移除标签页
   */
  async function removeTabFromCollect(collectId, tabId) {
    await updateCollects((current) => current.map((c) => {
      if (c.id === collectId) {
        return { ...c, tabs: c.tabs.filter((t) => t.id !== tabId) }
      }
      return c
    }))
  }

  /** 调整收藏集中已保存标签页的顺序 */
  async function moveTabInCollect(collectId, sourceTabId, targetTabId, placeAfter) {
    await updateCollects((current) => current.map((collect) => {
      if (collect.id !== collectId) return collect

      const sourceIndex = collect.tabs.findIndex((tab) => tab.id === sourceTabId)
      const targetIndex = collect.tabs.findIndex((tab) => tab.id === targetTabId)
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return collect

      const reorderedTabs = [...collect.tabs]
      const [source] = reorderedTabs.splice(sourceIndex, 1)
      let insertIndex = targetIndex + (placeAfter ? 1 : 0)
      if (sourceIndex < insertIndex) insertIndex -= 1
      reorderedTabs.splice(insertIndex, 0, source)
      return { ...collect, tabs: reorderedTabs }
    }))
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
    addTabsToCollect,
    removeTabFromCollect,
    moveTabInCollect,
    isDefault,
    getCollectsForTab,
    getAvailableCollects,
    DEFAULT_COLLECT_ID,
  }
}

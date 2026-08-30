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

/** 用于去重的 url 归一化:去除 hash,小写 host+path,query 保留(用于区分有效查询参数)。 */
function normalizeUrl(raw) {
  if (!raw) return ''
  try {
    const u = new URL(raw)
    return `${u.protocol}//${u.hostname.toLowerCase()}${u.pathname}${u.search}`
  } catch {
    return String(raw).trim()
  }
}

/** 用于导出导入的 schema 版本。 */
const EXPORT_SCHEMA = 'etab.collect/v1'

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
   * 同一 url 已存在时跳过（按 url 判重，不仅按 id）。
   * @returns {Promise<{added: number, skipped: number}>}
   */
  async function addTabToCollect(collectId, tabInfo) {
    let added = 0
    let skipped = 0
    await updateCollects((current) => current.map((c) => {
      if (c.id !== collectId) return c
      const urlExists = c.tabs.some((t) => normalizeUrl(t.url) === normalizeUrl(tabInfo.url))
      if (urlExists) {
        skipped = 1
        return c
      }
      added = 1
      return { ...c, tabs: [...c.tabs, { ...tabInfo }] }
    }))
    return { added, skipped }
  }

  /**
   * 向收藏集批量添加标签页，已存在的 url 会自动跳过。
   * @returns {Promise<{added: number, skipped: number}>}
   */
  async function addTabsToCollect(collectId, tabInfos) {
    let added = 0
    let skipped = 0
    await updateCollects((current) => current.map((collect) => {
      if (collect.id !== collectId) return collect

      const existingUrls = new Set(collect.tabs.map((tab) => normalizeUrl(tab.url)))
      const newTabs = []
      for (const tab of tabInfos) {
        const key = normalizeUrl(tab.url)
        if (existingUrls.has(key)) {
          skipped += 1
          continue
        }
        existingUrls.add(key)
        newTabs.push(tab)
      }
      added = newTabs.length
      return newTabs.length ? { ...collect, tabs: [...collect.tabs, ...newTabs] } : collect
    }))
    return { added, skipped }
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
   * 按 url 去重一个收藏集,保留每个 url 首次出现的条目。
   * @returns {Promise<{removed: number}>}
   */
  async function dedupByUrl(collectId) {
    let removed = 0
    await updateCollects((current) => current.map((collect) => {
      if (collect.id !== collectId) return collect
      const seen = new Set()
      const deduped = []
      for (const tab of collect.tabs) {
        const key = normalizeUrl(tab.url)
        if (seen.has(key)) {
          removed += 1
          continue
        }
        seen.add(key)
        deduped.push(tab)
      }
      return { ...collect, tabs: deduped }
    }))
    return { removed }
  }

  /**
   * 导出收藏集为 JSON 字符串（不写存储）。
   * @returns {string}
   */
  function exportCollect(collectId) {
    const target = collects.value.find((c) => c.id === collectId)
    if (!target) throw new Error('收藏集不存在。')
    if (target.id === DEFAULT_COLLECT_ID) throw new Error('Default 收藏集不可导出。')
    const payload = {
      schema: EXPORT_SCHEMA,
      exportedAt: new Date().toISOString(),
      name: target.name,
      tabs: target.tabs.map((tab) => ({
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl || '',
        savedAt: Date.now(),
      })),
    }
    return JSON.stringify(payload, null, 2)
  }

  /**
   * 导入 JSON 字符串为新收藏集。
   * @returns {Promise<{collectId: string, added: number, skipped: number, errors: string[]}>}
   */
  async function importCollect(jsonText) {
    let payload
    try {
      payload = JSON.parse(jsonText)
    } catch (e) {
      throw new Error(`JSON 无效：${e.message}`)
    }
    if (!payload || typeof payload !== 'object') throw new Error('JSON 格式错误。')
    const rawName = typeof payload.name === 'string' ? payload.name.trim() : ''
    if (!rawName) throw new Error('缺少 name 字段。')
    if (rawName.length > 80) throw new Error('name 字段过长（>80 字符）。')
    if (!Array.isArray(payload.tabs)) throw new Error('缺少 tabs 数组。')
    if (payload.tabs.length > 1000) throw new Error('tabs 数量超过 1000 上限。')

    const errors = []
    const cleaned = []
    for (const [index, raw] of payload.tabs.entries()) {
      if (!raw || typeof raw !== 'object') {
        errors.push(`第 ${index + 1} 条不是对象。`)
        continue
      }
      const url = typeof raw.url === 'string' ? raw.url.trim() : ''
      if (!url) {
        errors.push(`第 ${index + 1} 条缺少 url。`)
        continue
      }
      try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('协议必须是 http(s)')
      } catch (e) {
        errors.push(`第 ${index + 1} 条 url 无效：${e.message || '解析失败'}`)
        continue
      }
      cleaned.push({
        title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : url,
        url,
        favIconUrl: typeof raw.favIconUrl === 'string' ? raw.favIconUrl : '',
      })
    }

    if (cleaned.length === 0) {
      throw new Error(`无可导入的有效标签。${errors.length ? '问题：' + errors.join(' ') : ''}`)
    }

    const list = await updateCollects((current) => [
      ...current,
      { id: genId(), name: rawName, tabs: cleaned },
    ])
    const newCollect = list[list.length - 1]
    return {
      collectId: newCollect.id,
      added: cleaned.length,
      skipped: payload.tabs.length - cleaned.length,
      errors,
    }
  }

  /**
   * 合并 source 收藏集到 target,按 url 去重,删除 source。
   * @returns {Promise<{merged: number, removed: number}>}
   */
  async function mergeCollect(sourceCollectId, targetCollectId) {
    if (sourceCollectId === DEFAULT_COLLECT_ID || targetCollectId === DEFAULT_COLLECT_ID) {
      throw new Error('Default 收藏集不能参与合并。')
    }
    if (sourceCollectId === targetCollectId) throw new Error('源与目标不能相同。')
    let merged = 0
    let removed = 0
    await updateCollects((current) => {
      const source = current.find((c) => c.id === sourceCollectId)
      const target = current.find((c) => c.id === targetCollectId)
      if (!source || !target) return current

      const targetUrls = new Set(target.tabs.map((tab) => normalizeUrl(tab.url)))
      const additions = []
      for (const tab of source.tabs) {
        const key = normalizeUrl(tab.url)
        if (targetUrls.has(key)) {
          removed += 1
          continue
        }
        targetUrls.add(key)
        additions.push(tab)
        merged += 1
      }

      const next = current
        .filter((c) => c.id !== sourceCollectId)
        .map((c) => (c.id === targetCollectId ? { ...c, tabs: [...c.tabs, ...additions] } : c))

      if (selectedCollectId.value === sourceCollectId) {
        selectedCollectId.value = targetCollectId
      }
      return next
    })
    return { merged, removed }
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
    dedupByUrl,
    exportCollect,
    importCollect,
    mergeCollect,
    isDefault,
    getCollectsForTab,
    getAvailableCollects,
    DEFAULT_COLLECT_ID,
  }
}

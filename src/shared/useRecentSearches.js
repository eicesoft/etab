import { ref } from 'vue'

const STORAGE_KEY = 'etab_recent_searches'
const MAX_PER_KEY = 10
const VALID_KEYS = new Set(['tabs', 'popup'])

/**
 * 跨页面持久化最近搜索词。
 * 不同的 pageKey（如 'tabs' / 'popup'）互相隔离。
 */
export function useRecentSearches(pageKey) {
  if (!VALID_KEYS.has(pageKey)) {
    throw new Error(`useRecentSearches: 无效的 pageKey "${pageKey}"`)
  }

  const recent = ref([])

  async function init() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      recent.value = Array.isArray(result[STORAGE_KEY]?.[pageKey]) ? result[STORAGE_KEY][pageKey] : []
    } catch {
      recent.value = []
    }
  }

  async function pushQuery(rawQuery) {
    const query = String(rawQuery || '').trim()
    if (!query) return
    const lower = query.toLowerCase()
    const filtered = recent.value.filter((item) => item.toLowerCase() !== lower)
    filtered.unshift(query)
    const next = filtered.slice(0, MAX_PER_KEY)
    recent.value = next
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      const store = { ...(result[STORAGE_KEY] || {}) }
      store[pageKey] = next
      await chrome.storage.local.set({ [STORAGE_KEY]: store })
    } catch {
      // 静默失败：toast 不重要
    }
  }

  async function clear() {
    recent.value = []
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      const store = { ...(result[STORAGE_KEY] || {}) }
      delete store[pageKey]
      await chrome.storage.local.set({ [STORAGE_KEY]: store })
    } catch {
      // 静默失败
    }
  }

  return { recent, init, pushQuery, clear }
}

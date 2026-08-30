/**
 * Chrome Tabs API 封装
 * 统一处理权限检查和错误
 */

/**
 * 获取所有窗口的所有标签页
 * @returns {Promise<chrome.tabs.Tab[]>}
 */
export async function getAllTabs() {
  const tabs = await chrome.tabs.query({})
  return tabs
}

/** 获取所有 Chrome 标签组。 */
export async function getAllTabGroups() {
  return await chrome.tabGroups.query({})
}

/**
 * 按窗口分组获取标签页
 * @returns {Promise<{windowId: number, windowName: string, tabs: chrome.tabs.Tab[]}[]>}
 */
export async function getTabsByWindow() {
  const windows = await chrome.windows.getAll({ populate: true })
  return windows.map((win) => ({
    windowId: win.id,
    windowName: win.title || win.type || `Window ${win.id}`,
    tabs: win.tabs || [],
  }))
}

/**
 * 获取当前窗口的标签页
 * @returns {Promise<chrome.tabs.Tab[]>}
 */
export async function getCurrentWindowTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true })
  return tabs
}

/**
 * 激活并切换到指定标签页
 * @param {number} tabId
 * @param {number} [windowId]
 */
export async function activateTab(tabId, windowId) {
  try {
    if (windowId) {
      await chrome.windows.update(windowId, { focused: true })
    }
  } catch (e) {
    // 窗口可能已被关闭，继续尝试激活标签
  }
  await chrome.tabs.update(tabId, { active: true })
}

/**
 * 关闭指定标签页
 * @param {number} tabId
 */
export async function closeTab(tabId) {
  await chrome.tabs.remove(tabId)
}

/**
 * 关闭多个标签页
 * @param {number[]} tabIds
 */
export async function closeTabs(tabIds) {
  await chrome.tabs.remove(tabIds)
}

/**
 * 关闭与指定 hostname 匹配的所有标签页。
 * @param {string} hostname - 例如 "github.com"
 * @param {{windowId?: number}} [options] - 限定窗口
 * @returns {Promise<chrome.tabs.Tab[]>} 被关闭的标签页
 */
export async function closeTabsByDomain(hostname, { windowId } = {}) {
  if (!hostname) return []
  const target = hostname.toLowerCase()
  const tabs = await chrome.tabs.query(windowId ? { windowId } : {})
  const matching = tabs.filter((tab) => {
    if (!tab.url) return false
    try {
      return new URL(tab.url).hostname.toLowerCase() === target
    } catch {
      return false
    }
  })
  if (matching.length) {
    await chrome.tabs.remove(matching.map((tab) => tab.id))
  }
  return matching
}

/**
 * 提取 tab 的 hostname（用于显示与分组），无法解析时返回空串。
 * @param {string} url
 * @returns {string}
 */
export function getHostname(url) {
  if (!url) return ''
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

/**
 * 查找跨窗口的重复标签页。
 * 归一化规则:去除 hash 与 query 后按 url 精确匹配,保留至少 2 个 tab 的组。
 * @returns {Promise<Array<{url: string, tabs: chrome.tabs.Tab[]}>>}
 */
export async function findDuplicatesByUrl() {
  const tabs = await chrome.tabs.query({})
  const groups = new Map()
  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue
    const key = tab.url.replace(/#.*$/, '').replace(/\?.*$/, '')
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(tab)
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([url, tabs]) => ({ url, tabs }))
}

/**
 * 创建新标签页
 * @param {string} url
 * @param {Object} [options]
 * @returns {Promise<chrome.tabs.Tab>}
 */
export async function createTab(url, options = {}) {
  return await chrome.tabs.create({ url, ...options })
}

/**
 * 将同一窗口内的标签页建立为一个 Chrome 标签组。
 * @param {number[]} tabIds
 * @param {string} title
 */
export async function createTabGroup(tabIds, title, color = 'blue') {
  const groupId = await chrome.tabs.group({ tabIds })
  await chrome.tabGroups.update(groupId, { title, color, collapsed: false })
  return groupId
}

/**
 * 解散当前所有 Chrome 标签组(同时保留标签页本身,只是从分组里拿出来)。
 * 静默处理无 tabGroups 权限或不支持的浏览器。
 * @returns {Promise<number>} 被解散的标签页数量
 */
export async function ungroupAllTabs() {
  if (!chrome?.tabGroups?.query || !chrome?.tabs?.ungroup) return 0
  const groups = await chrome.tabGroups.query({})
  if (!groups.length) return 0
  const tabIdsByGroup = await Promise.all(
    groups.map((group) => chrome.tabs.query({ groupId: group.id }).then((tabs) => tabs.map((tab) => tab.id)))
  )
  const allTabIds = tabIdsByGroup.flat().filter((id) => Number.isInteger(id))
  if (!allTabIds.length) return 0
  await chrome.tabs.ungroup(allTabIds)
  return allTabIds.length
}

/**
 * 重新加载标签页
 * @param {number} tabId
 */
export async function reloadTab(tabId) {
  await chrome.tabs.reload(tabId)
}

/**
 * 固定/取消固定标签页
 * @param {number} tabId
 * @param {boolean} pinned
 */
export async function pinTab(tabId, pinned) {
  await chrome.tabs.update(tabId, { pinned })
}

/**
 * 静音/取消静音标签页
 * @param {number} tabId
 * @param {boolean} muted
 */
export async function muteTab(tabId, muted) {
  await chrome.tabs.update(tabId, { muted })
}

/**
 * 复制标签页
 * @param {number} tabId
 * @returns {Promise<chrome.tabs.Tab>}
 */
export async function duplicateTab(tabId) {
  return await chrome.tabs.duplicate(tabId)
}

/**
 * 将标签页移动到指定窗口中的位置
 * @param {number} tabId
 * @param {number} windowId
 * @param {number} index
 */
export async function moveTab(tabId, windowId, index) {
  return await chrome.tabs.move(tabId, { windowId, index })
}

/**
 * 获取标签页信息并格式化
 * @param {chrome.tabs.Tab} tab
 * @returns {Object}
 */
export function formatTabInfo(tab) {
  return {
    id: tab.id,
    windowId: tab.windowId,
    title: tab.title || 'Untitled',
    url: tab.url || '',
    favIconUrl: tab.favIconUrl || '',
    active: tab.active,
    pinned: tab.pinned,
    muted: tab.mutedInfo?.muted || false,
    audible: tab.audible || false,
    incognito: tab.incognito,
    index: tab.index,
    groupId: tab.groupId,
  }
}

/**
 * 获取扩展内资源的完整 URL
 * 兼容 chrome-extension:// 协议
 * @param {string} path - 相对于扩展根目录的路径
 * @returns {string}
 */
export function extensionUrl(path) {
  return chrome.runtime.getURL(path)
}

/** 默认 favicon 路径 */
export const DEFAULT_FAVICON = () => extensionUrl('icons/icon16.png')

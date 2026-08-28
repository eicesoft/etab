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
 * 创建新标签页
 * @param {string} url
 * @param {Object} [options]
 * @returns {Promise<chrome.tabs.Tab>}
 */
export async function createTab(url, options = {}) {
  return await chrome.tabs.create({ url, ...options })
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
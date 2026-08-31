/**
 * eTab Background Service Worker
 * 管理扩展的后台逻辑和消息通信
 */

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('eTab installed')
  } else if (details.reason === 'update') {
    console.log('eTab updated')
  }
  scheduleBadgeUpdate()
})

chrome.runtime.onStartup.addListener(() => {
  scheduleBadgeUpdate()
})

const COLLECTS_STORAGE_KEY = 'etab_collects'

async function updateCollects(mutator) {
  const commit = async () => {
    const result = await chrome.storage.local.get(COLLECTS_STORAGE_KEY)
    const current = Array.isArray(result[COLLECTS_STORAGE_KEY]) ? result[COLLECTS_STORAGE_KEY] : []
    const next = mutator(current)
    if (next === current) return current
    await chrome.storage.local.set({ [COLLECTS_STORAGE_KEY]: next })
    return next
  }
  if (globalThis.navigator?.locks?.request) {
    return globalThis.navigator.locks.request(COLLECTS_STORAGE_KEY, { mode: 'exclusive' }, commit)
  }
  return commit()
}

function syncedTabInfo(savedTab, liveTab) {
  return {
    ...savedTab,
    linkedTabId: liveTab.id,
    linkedWindowId: liveTab.windowId,
    title: liveTab.title || savedTab.title,
    url: liveTab.url || savedTab.url,
    favIconUrl: liveTab.favIconUrl || savedTab.favIconUrl || '',
  }
}

async function syncLinkedTab(tab) {
  if (typeof tab?.id !== 'number') return
  await updateCollects((collects) => {
    let changed = false
    const next = collects.map((collect) => {
      if (!Array.isArray(collect.tabs) || !collect.tabs.some((savedTab) => savedTab.linkedTabId === tab.id)) return collect
      changed = true
      return {
        ...collect,
        tabs: collect.tabs.map((savedTab) => savedTab.linkedTabId === tab.id ? syncedTabInfo(savedTab, tab) : savedTab),
      }
    })
    return changed ? next : collects
  })
}

async function unlinkClosedTab(tabId) {
  await updateCollects((collects) => {
    let changed = false
    const next = collects.map((collect) => {
      if (!Array.isArray(collect.tabs) || !collect.tabs.some((savedTab) => savedTab.linkedTabId === tabId)) return collect
      changed = true
      return {
        ...collect,
        tabs: collect.tabs.map((savedTab) => savedTab.linkedTabId === tabId
          ? { ...savedTab, linkedTabId: undefined, linkedWindowId: undefined }
          : savedTab),
      }
    })
    return changed ? next : collects
  })
}

async function linkCollectTabs(collectId, links) {
  const liveTabs = await Promise.all(links.map(async ({ storedTabId, tabId }) => {
    try {
      return { storedTabId, tab: await chrome.tabs.get(tabId) }
    } catch {
      return null
    }
  }))
  const linked = liveTabs.filter(Boolean)
  if (!linked.length) return
  await updateCollects((collects) => collects.map((collect) => {
    if (collect.id !== collectId || !Array.isArray(collect.tabs)) return collect
    const byStoredId = new Map(linked.map(({ storedTabId, tab }) => [storedTabId, tab]))
    return {
      ...collect,
      tabs: collect.tabs.map((savedTab) => {
        const liveTab = byStoredId.get(savedTab.id)
        return liveTab ? syncedTabInfo(savedTab, liveTab) : savedTab
      }),
    }
  }))
}

// 监听标签页变化，广播给所有页面
function notifyTabChange(action, tabInfo) {
  chrome.runtime.sendMessage({
    type: 'TAB_CHANGE',
    action,
    tab: tabInfo,
    timestamp: Date.now(),
  }).catch(() => {
    // 没有监听者时忽略错误
  })
}

chrome.tabs.onCreated.addListener((tab) => {
  notifyTabChange('created', tab)
  scheduleBadgeUpdate()
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.url || changeInfo.groupId !== undefined) {
    syncLinkedTab(tab).catch(() => {})
    notifyTabChange('updated', tab)
    scheduleBadgeUpdate()
  }
})

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  unlinkClosedTab(tabId).catch(() => {})
  notifyTabChange('removed', { id: tabId, windowId: removeInfo.windowId })
  scheduleBadgeUpdate()
})

chrome.tabs.onActivated.addListener((activeInfo) => {
  notifyTabChange('activated', activeInfo)
  scheduleBadgeUpdate()
})

chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  notifyTabChange('moved', { id: tabId, ...moveInfo })
  scheduleBadgeUpdate()
})

chrome.tabs.onAttached.addListener(() => scheduleBadgeUpdate())
chrome.tabs.onDetached.addListener(() => scheduleBadgeUpdate())

// 标签组的名称、颜色和成员变化同样需要刷新页面展示。
chrome.tabGroups.onCreated.addListener((group) => {
  notifyTabChange('group-created', group)
  scheduleBadgeUpdate()
})
chrome.tabGroups.onUpdated.addListener((group) => notifyTabChange('group-updated', group))
chrome.tabGroups.onMoved.addListener((group) => notifyTabChange('group-moved', group))
chrome.tabGroups.onRemoved.addListener((group) => {
  notifyTabChange('group-removed', group)
  scheduleBadgeUpdate()
})

// ---- 图标角标 ----

let badgeUpdateTimer = null

function scheduleBadgeUpdate() {
  if (badgeUpdateTimer) return
  badgeUpdateTimer = setTimeout(async () => {
    badgeUpdateTimer = null
    try {
      const all = await chrome.tabs.query({})
      const text = String(all.length)
      await chrome.action.setBadgeText({ text })
      await chrome.action.setBadgeBackgroundColor({ color: '#4a9eff' })
    } catch (e) {
      // 忽略：扩展权限未就绪
    }
  }, 200)
}

// ---- 快捷键 ----

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-tabs-manager') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/tabs/index.html') })
  }
})

// 处理来自页面（popup/tabs/options）的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_ALL_TABS':
      chrome.tabs.query({}, (tabs) => {
        sendResponse(tabs)
      })
      return true // 保持通道开放

    case 'GET_TAB_BY_ID':
      chrome.tabs.get(message.tabId, (tab) => {
        sendResponse(tab)
      })
      return true

    case 'CLOSE_TABS':
      chrome.tabs.remove(message.tabIds, () => {
        sendResponse({ success: true })
      })
      return true

    case 'ACTIVATE_TAB':
      (async () => {
        try {
          if (message.windowId) {
            await chrome.windows.update(message.windowId, { focused: true })
          }
          await chrome.tabs.update(message.tabId, { active: true })
          sendResponse({ success: true })
        } catch (e) {
          sendResponse({ error: e.message })
        }
      })()
      return true

    case 'LINK_COLLECT_TABS':
      linkCollectTabs(message.collectId, Array.isArray(message.tabs) ? message.tabs : [])
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ error: error.message }))
      return true

    default:
      sendResponse({ error: 'Unknown message type' })
      return false
  }
})

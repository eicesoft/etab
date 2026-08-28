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
})

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
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.url || changeInfo.groupId !== undefined) {
    notifyTabChange('updated', tab)
  }
})

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  notifyTabChange('removed', { id: tabId, windowId: removeInfo.windowId })
})

chrome.tabs.onActivated.addListener((activeInfo) => {
  notifyTabChange('activated', activeInfo)
})

chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  notifyTabChange('moved', { id: tabId, ...moveInfo })
})

// 标签组的名称、颜色和成员变化同样需要刷新页面展示。
chrome.tabGroups.onCreated.addListener((group) => notifyTabChange('group-created', group))
chrome.tabGroups.onUpdated.addListener((group) => notifyTabChange('group-updated', group))
chrome.tabGroups.onMoved.addListener((group) => notifyTabChange('group-moved', group))
chrome.tabGroups.onRemoved.addListener((group) => notifyTabChange('group-removed', group))

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

    default:
      sendResponse({ error: 'Unknown message type' })
      return false
  }
})

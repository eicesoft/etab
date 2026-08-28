import { ref, onMounted, onUnmounted } from 'vue'
import { getAllTabs, getAllTabGroups, formatTabInfo } from './api.js'

/**
 * 管理标签页状态的 Vue composable
 * 提供响应式 tabs 数据，自动监听背景广播更新
 */
export function useTabs() {
  const tabs = ref([])
  const tabGroups = ref([])
  const loading = ref(true)
  const error = ref(null)

  let messageListener = null

  async function fetchTabs() {
    try {
      loading.value = true
      const [raw, groups] = await Promise.all([getAllTabs(), getAllTabGroups()])
      tabs.value = raw.map(formatTabInfo)
      tabGroups.value = groups
      error.value = null
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  function handleMessage(message) {
    if (message.type === 'TAB_CHANGE') {
      fetchTabs()
    }
  }

  onMounted(() => {
    fetchTabs()
    messageListener = chrome.runtime.onMessage.addListener(handleMessage)
  })

  onUnmounted(() => {
    if (messageListener) {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  })

  return { tabs, tabGroups, loading, error, refresh: fetchTabs }
}

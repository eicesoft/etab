import { ref } from 'vue'
import { SETTINGS_KEY, createDefaultSettings, mergeSettings } from './settingsDefaults.js'

/**
 * 跨页面响应式读取 chrome.storage.sync 的 settings。
 * - init() 拉取并合并默认值
 * - confirmClose(tab) 在 confirmBeforeClose 开启时弹 confirm
 * - 自动监听 chrome.storage.onChanged 同步变更
 */
export function useSettings() {
  const settings = ref(createDefaultSettings())
  let changeListener = null

  async function init() {
    try {
      const result = await chrome.storage.sync.get(SETTINGS_KEY)
      settings.value = mergeSettings(result?.[SETTINGS_KEY])
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }

  function handleChange(changes, area) {
    if (area !== 'sync' || !changes[SETTINGS_KEY]) return
    settings.value = mergeSettings(changes[SETTINGS_KEY].newValue)
  }

  function watchStorage() {
    if (changeListener) return
    changeListener = (...args) => handleChange(...args)
    chrome.storage.onChanged.addListener(changeListener)
  }

  function unwatchStorage() {
    if (!changeListener) return
    chrome.storage.onChanged.removeListener(changeListener)
    changeListener = null
  }

  /**
   * 关闭前确认:开启时弹 confirm,返回 true 表示放行。
   * @param {{title?: string, url?: string}} [tab]
   */
  function confirmClose(tab) {
    if (!settings.value.confirmBeforeClose) return true
    const label = (tab?.title || tab?.url || '此标签页').slice(0, 80)
    return window.confirm(`确定要关闭「${label}」？`)
  }

  return { settings, init, watchStorage, unwatchStorage, confirmClose }
}

/**
 * 共享的 settings 默认值
 * 用于跨页面（options / tabs / popup）保持一致。
 */

export const SETTINGS_KEY = 'settings'

export const DEFAULT_SETTINGS = {
  defaultView: 'window',
  collectOpenMode: 'group',
  showFavicon: true,
  confirmBeforeClose: false,
  ai: {
    enabled: false,
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1024,
  },
}

export function createDefaultSettings() {
  return {
    ...DEFAULT_SETTINGS,
    ai: { ...DEFAULT_SETTINGS.ai },
  }
}

/** 把已存储的 settings 与默认值合并,补齐缺失字段。 */
export function mergeSettings(stored) {
  return {
    ...createDefaultSettings(),
    ...(stored || {}),
    ai: { ...DEFAULT_SETTINGS.ai, ...(stored?.ai || {}) },
  }
}

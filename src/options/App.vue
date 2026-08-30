<template>
  <div class="options-page">
    <header class="header">
      <h1 class="logo">eTab Settings</h1>
    </header>

    <div
      v-motion
      class="options-content"
      :initial="{ opacity: 0, y: 8 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 180 } }"
    >
      <!-- 常规设置 -->
      <section class="option-section">
        <h2>General</h2>

        <div class="option-item">
          <label>
            <span>Default view mode</span>
            <select v-model="settings.defaultView">
              <option value="window">Group by Window</option>
              <option value="flat">Flat List</option>
            </select>
          </label>
        </div>

        <div class="option-item">
          <label>
            <span>收藏集打开方式</span>
            <select v-model="settings.collectOpenMode">
              <option value="group">新建标签组打开</option>
              <option value="direct">直接打开</option>
            </select>
          </label>
        </div>

        <div class="option-item">
          <label>
            <input type="checkbox" v-model="settings.showFavicon" />
            <span>Show favicons</span>
          </label>
        </div>

        <div class="option-item">
          <label>
            <input type="checkbox" v-model="settings.confirmBeforeClose" />
            <span>Confirm before closing tabs</span>
          </label>
        </div>
      </section>

      <!-- AI 设置 -->
      <section class="option-section">
        <div class="section-heading">
          <div>
            <h2>AI 助手</h2>
            <p class="section-description">配置 OpenAI 或兼容服务，用于后续 AI 标签整理功能。</p>
          </div>
          <label class="switch-label">
            <span>启用 AI</span>
            <input v-model="settings.ai.enabled" type="checkbox" />
          </label>
        </div>

        <div class="option-item form-item">
          <label for="ai-api-base-url">API 地址</label>
          <input
            id="ai-api-base-url"
            v-model.trim="settings.ai.baseUrl"
            type="url"
            placeholder="https://api.openai.com/v1"
            autocomplete="url"
          />
          <small>可填写 API 根地址（如 https://api.openai.com/v1）或完整 chat/completions 地址。</small>
        </div>

        <div class="option-item form-item">
          <label for="ai-api-key">API Key</label>
          <div class="secret-input">
            <input
              id="ai-api-key"
              v-model="apiKey"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="sk-..."
              autocomplete="off"
              spellcheck="false"
            />
            <button class="btn-ghost" type="button" @click="showApiKey = !showApiKey">
              {{ showApiKey ? '隐藏' : '显示' }}
            </button>
          </div>
          <small>密钥仅保存在此浏览器的本地存储中，不会随 Chrome 同步。</small>
        </div>

        <div class="form-grid">
          <div class="option-item form-item">
            <label for="ai-model">模型</label>
            <input id="ai-model" v-model.trim="settings.ai.model" type="text" placeholder="gpt-4o-mini" />
          </div>
          <div class="option-item form-item">
            <label for="ai-temperature">创意度</label>
            <input id="ai-temperature" v-model.number="settings.ai.temperature" type="number" min="0" max="2" step="0.1" />
          </div>
          <div class="option-item form-item">
            <label for="ai-max-tokens">最大输出 Tokens</label>
            <input id="ai-max-tokens" v-model.number="settings.ai.maxTokens" type="number" min="1" max="16384" step="1" />
          </div>
        </div>

        <div class="ai-test-row">
          <button class="btn-ghost" type="button" :disabled="isTesting" @click="testAiConnection">
            {{ isTesting ? '测试中…' : '测试 API 连接' }}
          </button>
          <span v-if="connectionStatus" class="connection-status" :class="connectionStatus.type" role="status">
            {{ connectionStatus.message }}
          </span>
        </div>
      </section>

      <!-- 快捷键 -->
      <section class="option-section">
        <h2>Shortcuts</h2>
        <p class="text-secondary">
          You can configure keyboard shortcuts in
          <code>chrome://extensions/shortcuts</code>
        </p>
      </section>

      <!-- 关于 -->
      <section class="option-section">
        <h2>About</h2>
        <div class="option-item">
          <span>eTab v0.1.0</span>
        </div>
        <div class="option-item">
          <span>A powerful tab management extension</span>
        </div>
      </section>

      <!-- 操作按钮 -->
      <div class="option-actions">
        <button class="btn-primary" @click="saveSettings">Save Settings</button>
        <button class="btn-ghost" @click="resetSettings">Reset to Default</button>
      </div>

      <div v-if="saved" class="toast">Settings saved!</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const DEFAULT_SETTINGS = {
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

function createDefaultSettings() {
  return {
    ...DEFAULT_SETTINGS,
    ai: { ...DEFAULT_SETTINGS.ai },
  }
}

const settings = ref(createDefaultSettings())
const saved = ref(false)
const apiKey = ref('')
const showApiKey = ref(false)
const isTesting = ref(false)
const connectionStatus = ref(null)

onMounted(async () => {
  try {
    const [syncResult, localResult] = await Promise.all([
      chrome.storage.sync.get('settings'),
      chrome.storage.local.get('etab_ai_api_key'),
    ])
    const storedSettings = syncResult.settings
    if (storedSettings) {
      settings.value = {
        ...createDefaultSettings(),
        ...storedSettings,
        ai: { ...DEFAULT_SETTINGS.ai, ...storedSettings.ai },
      }
    }
    apiKey.value = localResult.etab_ai_api_key || ''
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
})

async function saveSettings() {
  try {
    settings.value.ai.temperature = Math.min(2, Math.max(0, Number(settings.value.ai.temperature) || 0))
    settings.value.ai.maxTokens = Math.min(16384, Math.max(1, Math.floor(Number(settings.value.ai.maxTokens) || 1)))
    await Promise.all([
      chrome.storage.sync.set({ settings: settings.value }),
      chrome.storage.local.set({ etab_ai_api_key: apiKey.value.trim() }),
    ])
    saved.value = true
    setTimeout(() => {
      saved.value = false
    }, 2000)
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

async function resetSettings() {
  settings.value = createDefaultSettings()
  apiKey.value = ''
  await saveSettings()
}

function formatApiError(status, payload) {
  const message = payload?.error?.message || payload?.message
  return message ? `连接失败（${status}）：${message}` : `连接失败（HTTP ${status}）`
}

async function testAiConnection() {
  connectionStatus.value = null
  const key = apiKey.value.trim()

  if (!key) {
    connectionStatus.value = { type: 'error', message: '请先填写 API Key。' }
    return
  }

  let apiUrl
  try {
    const baseUrl = new URL(settings.value.ai.baseUrl.trim())
    if (!['https:', 'http:'].includes(baseUrl.protocol)) {
      throw new Error('协议必须为 HTTP 或 HTTPS')
    }
    apiUrl = /\/chat\/completions\/?$/i.test(baseUrl.pathname)
      ? new URL(baseUrl.href.replace(/\/chat\/completions\/?$/i, '/models'))
      : new URL('models', `${baseUrl.href.replace(/\/?$/, '/')}`)
  } catch (error) {
    connectionStatus.value = { type: 'error', message: `API 地址无效：${error.message}` }
    return
  }

  isTesting.value = true
  try {
    const originPattern = `${apiUrl.origin}/*`
    const manifest = chrome.runtime.getManifest()
    const declaredOrigins = [
      ...(manifest.host_permissions || []),
      ...(manifest.optional_host_permissions || []),
    ]
    if (!declaredOrigins.length) {
      connectionStatus.value = {
        type: 'error',
        message: '扩展权限配置尚未生效。请到 chrome://extensions 重新加载 eTab 后再试。',
      }
      return
    }

    let granted = await chrome.permissions.contains({ origins: [originPattern] })
    if (!granted) {
      granted = await chrome.permissions.request({ origins: [originPattern] })
    }
    if (!granted) {
      connectionStatus.value = { type: 'error', message: '未获得该 API 域名的访问权限。' }
      return
    }

    const response = await fetch(apiUrl.href, {
      headers: { Authorization: `Bearer ${key}` },
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      connectionStatus.value = { type: 'error', message: formatApiError(response.status, payload) }
      return
    }

    const models = Array.isArray(payload?.data) ? payload.data : []
    const modelExists = models.some((item) => item.id === settings.value.ai.model)
    connectionStatus.value = {
      type: 'success',
      message: modelExists
        ? `连接成功，已找到模型 ${settings.value.ai.model}。`
        : `连接成功（返回 ${models.length} 个模型）；未在列表中找到当前模型。`,
    }
  } catch (error) {
    const needsReload = error.message?.includes('Only permissions specified in the manifest')
    connectionStatus.value = {
      type: 'error',
      message: needsReload
        ? '扩展权限配置尚未生效。请到 chrome://extensions 重新加载 eTab 后再试。'
        : `无法连接到 API：${error.message}`,
    }
  } finally {
    isTesting.value = false
  }
}
</script>

<style scoped>
.options-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px 24px;
  min-height: 100vh;
  background: var(--bg-primary);
}

.header {
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.logo {
  font-size: 22px;
  color: var(--accent);
}

.options-content {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.option-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-section h2 {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent);
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.section-description,
.form-item small {
  color: var(--text-secondary);
  font-size: 12px;
}

.section-description {
  margin-top: 4px;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-card);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.option-item label {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  cursor: pointer;
}

.option-item label span {
  flex: 1;
  font-size: 14px;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  font-size: 13px;
  cursor: pointer;
}

.option-item select {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 6px 10px;
  border-radius: var(--radius);
  font-size: 13px;
  outline: none;
}

.option-item input[type='checkbox'] {
  accent-color: var(--accent);
  width: 16px;
  height: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 7px;
}

.form-item > label {
  font-size: 13px;
  font-weight: 600;
}

.form-item input {
  width: 100%;
  padding: 8px 10px;
  color: var(--text-primary);
  font: inherit;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  outline: none;
}

.form-item input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.secret-input {
  display: flex;
  gap: 8px;
}

.secret-input .btn-ghost {
  flex-shrink: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.ai-test-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ai-test-row button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.connection-status {
  font-size: 12px;
}

.connection-status.success {
  color: #1a9e4a;
}

.connection-status.error {
  color: var(--danger);
}

@media (max-width: 560px) {
  .section-heading {
    flex-direction: column;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}

.text-secondary {
  color: var(--text-secondary);
  font-size: 13px;
}

.text-secondary code {
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.option-actions {
  display: flex;
  gap: 10px;
  padding-top: 8px;
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--success);
  color: #fff;
  padding: 10px 24px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 600;
  animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>

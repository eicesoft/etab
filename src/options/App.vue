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
}

const settings = ref({ ...DEFAULT_SETTINGS })
const saved = ref(false)

onMounted(async () => {
  try {
    const result = await chrome.storage.sync.get('settings')
    if (result.settings) {
      settings.value = { ...DEFAULT_SETTINGS, ...result.settings }
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
})

async function saveSettings() {
  try {
    await chrome.storage.sync.set({ settings: settings.value })
    saved.value = true
    setTimeout(() => {
      saved.value = false
    }, 2000)
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

async function resetSettings() {
  settings.value = { ...DEFAULT_SETTINGS }
  await saveSettings()
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

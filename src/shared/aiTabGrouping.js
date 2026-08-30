const AI_KEY_STORAGE_KEY = 'etab_ai_api_key'
const GROUP_COLORS = new Set(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'])

function chatCompletionsUrl(baseUrl) {
  const base = new URL(baseUrl.trim())
  if (!['https:', 'http:'].includes(base.protocol)) {
    throw new Error('AI API 地址必须使用 HTTP 或 HTTPS。')
  }
  // 同时支持填写 API 根地址（…/v1）和完整端点（…/v1/chat/completions）。
  if (/\/chat\/completions\/?$/i.test(base.pathname)) return base
  return new URL('chat/completions', `${base.href.replace(/\/?$/, '/')}`)
}

function parseJson(content) {
  const cleaned = String(content || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error(`模型没有返回可解析的 JSON 数据：${cleaned.slice(0, 160) || '（空响应）'}`)
  }
}

/**
 * 提取一条 SSE 事件中所有 data: 行的内容（按规范用换行拼接）。
 */
function sseEventData(rawEvent) {
  return rawEvent
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''))
    .join('\n')
}

/**
 * 读取 text/event-stream 流式响应，逐段回调 onChunk 并累积 delta.content
 * 与 delta.reasoning_content（思考模型输出）。
 */
async function readSseStream(response, onChunk) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let reasoning = ''
  let finishReason = null
  let index = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

      let boundary
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)

        const data = sseEventData(rawEvent)
        if (!data) continue
        if (data === '[DONE]') {
          return { content, reasoning, finishReason }
        }

        let chunk
        try {
          chunk = JSON.parse(data)
        } catch {
          chunk = null
        }
        if (!chunk) continue

        const choice = chunk.choices?.[0]
        const delta = choice?.delta?.content
        if (typeof delta === 'string' && delta) content += delta
        const reasoningDelta = choice?.delta?.reasoning_content
        if (typeof reasoningDelta === 'string' && reasoningDelta) reasoning += reasoningDelta
        if (choice?.finish_reason) finishReason = choice.finish_reason
        if (delta || reasoningDelta) {
          onChunk({ index: index++, delta: delta || '', content, reasoning })
        }
      }
    }
  } catch (error) {
    throw new Error(`读取 AI 流式响应失败：${error.message || error}`)
  } finally {
    reader.cancel().catch(() => {})
  }

  return { content, reasoning, finishReason }
}

/**
 * 将模型返回的数据收敛为可直接传给 chrome.tabs.group 的安全分组。
 * 只接受候选标签中的 ID；同一标签不会出现在多个组中，且每组只能属于一个窗口。
 */
export function validateTabGroups(payload, candidateTabs) {
  if (!Array.isArray(payload?.groups)) {
    throw new Error('模型响应缺少 groups 数组。')
  }

  const tabsById = new Map(candidateTabs.map((tab) => [tab.id, tab]))
  const usedIds = new Set()
  const groups = []

  for (const item of payload.groups) {
    const ids = [...new Set(Array.isArray(item?.tabIds) ? item.tabIds : [])]
      .filter((id) => Number.isInteger(id) && tabsById.has(id) && !usedIds.has(id))
    if (ids.length < 2) continue

    const windowId = tabsById.get(ids[0]).windowId
    const sameWindowIds = ids.filter((id) => tabsById.get(id).windowId === windowId)
    if (sameWindowIds.length < 2) continue

    sameWindowIds.forEach((id) => usedIds.add(id))
    const name = String(item?.name || 'AI 分组').trim().slice(0, 40) || 'AI 分组'
    groups.push({
      name,
      tabIds: sameWindowIds,
      color: GROUP_COLORS.has(item?.color) ? item.color : 'blue',
    })
  }

  return groups
}

function buildPrompt(tabs) {
  return `你是浏览器标签整理助手。按主题将标签分组；只在同一 windowId 内组合至少 2 个标签。不要创建单标签分组，不要遗漏或编造 tabId。仅返回 JSON，不要 Markdown 或解释，格式必须是：
{"groups":[{"name":"简短分组名称","color":"blue","tabIds":[101,102]}]}

可用颜色只能是 grey、blue、red、yellow、green、pink、purple、cyan、orange。
待整理标签：
${JSON.stringify(tabs.map(({ id, windowId, title, url }) => ({ id, windowId, title, url })))} `
}

/**
 * 通过标准异步 Chat Completions 请求模型输出并验证分组。
 * 服务端返回流式（text/event-stream）时逐 chunk 解析并经 onChunk 上报，否则按普通 JSON 处理。
 * 调用前须已通过“测试 API 连接”授予自定义域名访问权限。
 */
export async function requestAiTabGroups(
  candidateTabs,
  { onProgress = () => {}, onResult = () => {}, onChunk = () => {} } = {}
) {
  onProgress('preparing')
  const [syncResult, localResult] = await Promise.all([
    chrome.storage.sync.get('settings'),
    chrome.storage.local.get(AI_KEY_STORAGE_KEY),
  ])
  const ai = syncResult.settings?.ai
  const apiKey = localResult[AI_KEY_STORAGE_KEY]?.trim()

  if (!ai?.enabled) throw new Error('请先在设置中启用 AI 助手。')
  if (!apiKey) throw new Error('请先在设置中填写 AI API Key。')
  if (!ai.baseUrl || !ai.model) throw new Error('请先填写 AI API 地址和模型。')
  if (candidateTabs.length < 2) return []

  const endpoint = chatCompletionsUrl(ai.baseUrl)
  const allowed = await chrome.permissions.contains({ origins: [`${endpoint.origin}/*`] })
  if (!allowed) throw new Error('该 API 域名尚未授权。请先在设置中点击“测试 API 连接”。')

  onProgress('requesting')
  const response = await fetch(endpoint.href, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ai.model,
      temperature: ai.temperature,
      max_tokens: ai.maxTokens,
      response_format: { type: 'json_object' },
      stream: true,
      messages: [
        { role: 'system', content: '严格遵循用户指定的 JSON 格式返回结果。' },
        { role: 'user', content: buildPrompt(candidateTabs) },
      ],
    }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error?.message || body?.message || `AI 请求失败（HTTP ${response.status}）。`)
  }

  const contentType = response.headers.get('content-type') || ''
  let content = ''
  if (contentType.includes('text/event-stream')) {
    onProgress('requesting', '已建立流式连接，等待模型输出…')
    content = (await readSseStream(response, onChunk)).content
  } else {
    const body = await response.json().catch(() => null)
    content = body?.choices?.[0]?.message?.content || ''
  }
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI 服务未返回有效的模型内容。')
  }
  onResult(content)

  onProgress('validating')
  return validateTabGroups(parseJson(content), candidateTabs)
}

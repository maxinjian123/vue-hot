const axios = require('axios')

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

const AVAILABLE_MODELS = {
  'gemma3:4b': { name: 'Gemma3 4B', description: '快速响应模型，适合简单任务', type: 'fast' },
  'qwen3.5:4b': { name: 'Qwen3.5 4B', description: '深度推理模型，适合复杂分析任务', type: 'deep' },
}

async function chatCompletion(messages, options = {}) {
  const model = options.model || process.env.OLLAMA_DEFAULT_MODEL || 'gemma3:4b'
  const temperature = options.temperature ?? 0.3
  const maxTokens = options.max_tokens ?? 4096

  console.log(`[Ollama] 调用本地模型: ${model}`)
  console.log(`[Ollama] 服务地址: ${OLLAMA_BASE_URL}`)

  try {
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
      model,
      messages,
      stream: false,
      format: options.format || undefined,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    }, {
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.data || !response.data.message) {
      throw new Error('Ollama返回数据格式错误')
    }

    const content = response.data.message.content

    console.log(`[Ollama] 模型 ${model} 响应成功，token统计:`)
    console.log(`[Ollama] - prompt tokens: ${response.data.prompt_eval_count}`)
    console.log(`[Ollama] - completion tokens: ${response.data.eval_count}`)
    console.log(`[Ollama] - 耗时: ${(response.data.total_duration / 1e9).toFixed(2)}s`)

    return content
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`无法连接到Ollama服务 (${OLLAMA_BASE_URL})，请确保Ollama已启动`)
    }
    if (error.code === 'ETIMEDOUT') {
      throw new Error('Ollama请求超时，请检查模型是否已加载')
    }
    if (error.response && error.response.status === 404) {
      throw new Error(`模型 ${model} 未找到，请先使用 ollama pull ${model} 下载`)
    }
    throw error
  }
}

async function chatCompletionWithJson(messages, options = {}) {
  const content = await chatCompletion(messages, {
    ...options,
  })

  console.log(`[Ollama] 原始响应长度: ${content.length} 字符`)
  console.log(`[Ollama] 原始响应(前300字): ${content.substring(0, 300)}`)

  let jsonStr = content.trim()

  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
    console.log('[Ollama] 检测到markdown代码块，已提取JSON')
  }

  const bracketStart = jsonStr.indexOf('[')
  const braceStart = jsonStr.indexOf('{')
  let start = -1
  if (bracketStart >= 0 && braceStart >= 0) {
    start = Math.min(bracketStart, braceStart)
  } else if (bracketStart >= 0) {
    start = bracketStart
  } else if (braceStart >= 0) {
    start = braceStart
  }

  if (start > 0) {
    jsonStr = jsonStr.substring(start)
  }

  try {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) {
      console.log(`[Ollama] JSON解析成功，数组长度: ${parsed.length}`)
    } else {
      const keys = Object.keys(parsed)
      console.log(`[Ollama] JSON解析成功，对象字段: [${keys.join(', ')}]`)
      const arrKey = keys.find(k => Array.isArray(parsed[k]))
      if (arrKey) {
        console.log(`[Ollama] 检测到嵌套数组 ${arrKey}，长度: ${parsed[arrKey].length}`)
      }
    }
    return parsed
  } catch (parseError) {
    console.error('[Ollama] JSON解析失败，尝试修复...')
    console.error('[Ollama] 原始内容:', jsonStr.substring(0, 500))
    throw new Error(`Ollama返回的JSON格式无效: ${parseError.message}`)
  }
}

async function getAvailableModels() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 10000,
    })

    if (response.data && response.data.models) {
      return response.data.models.map(m => m.name)
    }
    return []
  } catch (error) {
    console.error('[Ollama] 获取模型列表失败:', error.message)
    return []
  }
}

async function checkHealth() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000,
    })
    return {
      status: 'ok',
      models: response.data?.models?.length || 0,
      url: OLLAMA_BASE_URL,
    }
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      url: OLLAMA_BASE_URL,
    }
  }
}

function getModelInfo(modelName) {
  return AVAILABLE_MODELS[modelName] || null
}

function getAllModels() {
  return AVAILABLE_MODELS
}

module.exports = {
  OLLAMA_BASE_URL,
  AVAILABLE_MODELS,
  chatCompletion,
  chatCompletionWithJson,
  getAvailableModels,
  checkHealth,
  getModelInfo,
  getAllModels,
}

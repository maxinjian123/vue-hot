const OpenAI = require('openai')

const QWEN_API_KEY = 'sk-448c2f41b96e4232ba68743634238878'
const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const QWEN_MODEL = 'qwen3.6-flash'

function createQwenClient() {
  return new OpenAI({
    apiKey: QWEN_API_KEY,
    baseURL: QWEN_BASE_URL,
  })
}

async function chatCompletion(messages, options = {}) {
  const client = createQwenClient()
  const response = await client.chat.completions.create({
    model: QWEN_MODEL,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.max_tokens ?? 4096,
    stream: false,
  })
  return response.choices[0].message.content
}

async function chatCompletionWithJson(messages, options = {}) {
  const content = await chatCompletion(messages, options)

  let jsonStr = content.trim()
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
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

  return JSON.parse(jsonStr)
}

module.exports = {
  QWEN_MODEL,
  chatCompletion,
  chatCompletionWithJson,
}

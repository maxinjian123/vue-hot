const OpenAI = require('openai')

const SPARK_API_KEY = '1e012d39d7bfcd80c68246e20814cda7'
const SPARK_API_SECRET = 'NzlkNDQwNDExODA1MGIwMGFiNDMxOTIy'
const SPARK_BASE_URL = 'https://spark-api-open.xf-yun.com/v2'
const SPARK_MODEL = 'spark-x'

function createSparkClient() {
  return new OpenAI({
    apiKey: `${SPARK_API_KEY}:${SPARK_API_SECRET}`,
    baseURL: SPARK_BASE_URL,
  })
}

async function chatCompletion(messages, options = {}) {
  const client = createSparkClient()
  const response = await client.chat.completions.create({
    model: SPARK_MODEL,
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
  SPARK_MODEL,
  chatCompletion,
  chatCompletionWithJson,
}

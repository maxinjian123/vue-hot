const fs = require('fs')
const path = require('path')
require('dotenv').config()
const OpenAI = require('openai')
const sparkAnalyzer = require('./sparkAnalyzer')
const qwenAnalyzer = require('./qwenAnalyzer')
const ollamaAnalyzer = require('./ollamaAnalyzer')
const {Setting} = require('../models')

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL

const USE_LOCAL_AI = process.env.USE_LOCAL_AI === 'true'

const deepseekClient = new OpenAI({
    apiKey: DEEPSEEK_API_KEY,
    baseURL: DEEPSEEK_BASE_URL,
})

function loadPrompt(filename) {
    const filePath = path.join(__dirname, 'prompts', filename)
    return fs.readFileSync(filePath, 'utf-8')
}

async function getActiveModel() {
    try {
        const setting = await Setting.findOne({where: {key: 'deepseek_model'}})
        return setting?.value || DEEPSEEK_MODEL
    } catch {
        return DEEPSEEK_MODEL
    }
}

function credibilityTextFromScore(score) {
    if (score <= 20) return '极低可信度'
    if (score <= 40) return '较低可信度'
    if (score <= 60) return '一般可信度'
    if (score <= 80) return '较高可信度'
    return '高度可信'
}

function computeCredibility(item) {
    if (item.credibilityPercentage && item.credibilityText) return item
    const pct = item.credibilityPercentage != null ? item.credibilityPercentage : (item.credibilityScore || 50)
    return {
        credibilityPercentage: pct,
        credibilityText: item.credibilityText || credibilityTextFromScore(pct),
    }
}

function buildAiAnalysis(item) {
    const credibility = computeCredibility(item)
    return {
        isRelevant: item.isRelevant !== false,
        importance: item.importance || 5,
        credibilityPercentage: credibility.credibilityPercentage,
        credibilityText: credibility.credibilityText,
        reason: item.reason || '',
        scopeTags: item.scopeTags || [],
        shortTitle: item.shortTitle || '',
    }
}

function resolveAiContent(parsed) {
    if (Array.isArray(parsed)) return parsed
    return parsed.results || parsed.items || parsed.data || []
}

const KEYWORD_ANALYSIS_TEMPLATE = loadPrompt('keywordAnalysis.txt')
const HOT_TOPIC_SUMMARY_TEMPLATE = loadPrompt('hotTopicSummary.txt')

/**
 * 从正则匹配结果中提取JSON字符串
 *
 * 如果正则匹配成功，则提取匹配组中的内容并去除首尾空白字符；
 * 否则返回原始JSON字符串
 *
 * @param {Array} jsonMatch - 正则表达式的匹配结果数组，通常为 null 或包含匹配项的数组
 * @param {string} jsonStr - 待处理的JSON字符串
 * @returns {string} 处理后的JSON字符串
 */
function extracted(jsonMatch, jsonStr) {
    if (jsonMatch) jsonStr = jsonMatch[1].trim()
    return jsonStr;
}

async function callAiChat(messages, temperature, maxTokens) {
    const model = await getActiveModel()
    console.log(`[AI] 使用模型: ${model}`)
    console.log(`[AI] 本地AI模式: ${USE_LOCAL_AI ? '已启用 (Ollama)' : '未启用 (云端API)'}`)

    if (USE_LOCAL_AI) {
        console.log('[AI] >>> 调用本地Ollama服务 <<<')
        try {
            const ollamaModel = process.env.OLLAMA_DEFAULT_MODEL || 'gemma3:4b'
            const ollamaSystemMsg = messages.find(m => m.role === 'system')
            const ollamaUserMsg = messages.find(m => m.role === 'user')
            const systemContent = ollamaSystemMsg ? ollamaSystemMsg.content + '\n请只返回JSON格式的结果，不要包含任何其他文字。' : '请只返回JSON格式的结果，不要包含任何其他文字。'
            const content = await ollamaAnalyzer.chatCompletion([
                {role: 'system', content: systemContent},
                {role: 'user', content: ollamaUserMsg ? ollamaUserMsg.content : ''},
            ], {model: ollamaModel, temperature, max_tokens: maxTokens})

            console.log(`[AI] Ollama原始响应长度: ${content.length} 字符`)
            console.log(`[AI] Ollama原始响应: ${content}`)

            let jsonStr = content.trim()
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
            if (jsonMatch) jsonStr = jsonMatch[1].trim()
            const bracketStart = jsonStr.indexOf('[')
            const braceStart = jsonStr.indexOf('{')
            let start = -1
            if (bracketStart >= 0 && braceStart >= 0) start = Math.min(bracketStart, braceStart)
            else if (bracketStart >= 0) start = bracketStart
            else if (braceStart >= 0) start = braceStart
            if (start > 0) jsonStr = jsonStr.substring(start)

            const parsed = JSON.parse(jsonStr)
            if (Array.isArray(parsed)) {
                console.log(`[AI] Ollama解析结果: 数组, 长度=${parsed.length}`)
            } else {
                console.log(`[AI] Ollama解析结果: 对象, 字段=[${Object.keys(parsed).join(', ')}]`)
            }
            return parsed
        } catch (error) {
            console.error('[AI] 本地Ollama调用失败:', error.message)
            console.error('[AI] 失败响应内容:', error.response?.data || '无')
            console.log('[AI] 自动切换到云端API...')
        }
    }

    if (model === 'spark-x') {
        const sparkSystemMsg = messages.find(m => m.role === 'system')
        const sparkUserMsg = messages.find(m => m.role === 'user')
        const systemContent = sparkSystemMsg ? sparkSystemMsg.content + '\n请只返回JSON格式的结果，不要包含任何其他文字。' : '请只返回JSON格式的结果，不要包含任何其他文字。'
        const content = await sparkAnalyzer.chatCompletion([
            {role: 'system', content: systemContent},
            {role: 'user', content: sparkUserMsg ? sparkUserMsg.content : ''},
        ], {temperature, max_tokens: maxTokens})

        let jsonStr = content.trim()
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
        jsonStr = extracted(jsonMatch, jsonStr);

        const bracketStart = jsonStr.indexOf('[')
        const braceStart = jsonStr.indexOf('{')
        let start = -1
        if (bracketStart >= 0 && braceStart >= 0) start = Math.min(bracketStart, braceStart)
        else if (bracketStart >= 0) start = bracketStart
        else if (braceStart >= 0) start = braceStart
        if (start > 0) jsonStr = jsonStr.substring(start)
        return JSON.parse(jsonStr)
    }

    if (model === 'qwen-turbo') {
        const qwenSystemMsg = messages.find(m => m.role === 'system')
        const qwenUserMsg = messages.find(m => m.role === 'user')
        const systemContent = qwenSystemMsg ? qwenSystemMsg.content + '\n请只返回JSON格式的结果，不要包含任何其他文字。' : '请只返回JSON格式的结果，不要包含任何其他文字。'
        const content = await qwenAnalyzer.chatCompletion([
            {role: 'system', content: systemContent},
            {role: 'user', content: qwenUserMsg ? qwenUserMsg.content : ''},
        ], {temperature, max_tokens: maxTokens})

        let jsonStr = content.trim()
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) jsonStr = jsonMatch[1].trim()
        const bracketStart = jsonStr.indexOf('[')
        const braceStart = jsonStr.indexOf('{')
        let start = -1
        if (bracketStart >= 0 && braceStart >= 0) start = Math.min(bracketStart, braceStart)
        else if (bracketStart >= 0) start = bracketStart
        else if (braceStart >= 0) start = braceStart
        if (start > 0) jsonStr = jsonStr.substring(start)
        return JSON.parse(jsonStr)
    }

    const response = await deepseekClient.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages,
        response_format: {type: 'json_object'},
        temperature,
        max_tokens: maxTokens,
    })
    return JSON.parse(response.choices[0].message.content)
}

async function analyzeKeywordResults(keyword, results) {
    if (!results || results.length === 0) return results

    const model = await getActiveModel()
    console.log(`[AI] analyzeKeywordResults — 关键词: "${keyword}" — 模型: ${model}`)

    const batchSize = 20
    const analyzed = []
    const captureTime = new Date()

    for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize)
        const itemsText = batch
            .map((item, idx) => {
                let extra = ''
                if (item.likes || item.comments || item.views) {
                    extra = ` | 互动: 👍${item.likes || 0} 💬${item.comments || 0} 👁${item.views || 0}`
                }
                const contentSnippet = item.content ? ` | 内容: ${item.content.substring(0, 80)}` : ''
                return `[${idx}] 标题: ${item.title || ''} | 来源: ${item.source || ''}${extra}${contentSnippet}`
            })
            .join('\n')

        const userPrompt = KEYWORD_ANALYSIS_TEMPLATE
            .replace('{{keyword}}', keyword)
            .replace('{{itemsText}}', itemsText)

        try {
            const parsed = await callAiChat(
                [
                    {role: 'system', content: '你是一个专业的内容审核员。请只返回JSON格式的结果。'},
                    {role: 'user', content: userPrompt},
                ],
                0.3,
                4000
            )

            const items = resolveAiContent(parsed)

            for (const aiItem of items) {
                const original = batch[aiItem.index]
                if (!original) continue

                const aiAnalysis = buildAiAnalysis(aiItem)
                const shortTitle = aiItem.shortTitle || original.title || ''
                const finalTitle = shortTitle.length > 30 ? shortTitle.substring(0, 30) : shortTitle

                const scopeTags = aiItem.scopeTags || []
                const scopeValue = scopeTags.length > 0 ? scopeTags.join(',') : keyword

                analyzed.push({
                    ...original,
                    isRelevant: aiAnalysis.isRelevant,
                    summary: aiAnalysis.reason || original.title || '',
                    importance: aiAnalysis.importance,
                    aiAnalysis: aiAnalysis,
                    shortTitle: finalTitle,
                    scopeTags: scopeTags,
                    scopeValue: scopeValue,
                    captureTime: captureTime,
                })
            }
        } catch (err) {
            console.error(`[AI] 分析异常，关键词 "${keyword}" (模型: ${model}):`, err.message)
            for (const item of batch) {
                analyzed.push({
                    ...item,
                    isRelevant: true,
                    summary: item.title || '',
                    importance: 5,
                    aiAnalysis: buildAiAnalysis({
                        isRelevant: true,
                        importance: 5,
                        credibilityPercentage: 50,
                        reason: 'AI 分析异常，使用默认值',
                        shortTitle: (item.title || '').substring(0, 30),
                        scopeTags: [keyword],
                    }),
                    shortTitle: (item.title || '').substring(0, 30),
                    scopeTags: [keyword],
                    scopeValue: keyword,
                    captureTime: captureTime,
                })
            }
        }
    }

    return analyzed
}

async function summarizeHotTopics(scope, items) {
    if (!items || items.length === 0) return []

    const model = await getActiveModel()
    console.log(`[AI] 摘要热门话题 — 热点范围: "${scope}" — 模型: ${model}`)

    const itemsText = items
        .slice(0, 30)
        .map((item, idx) => {
            let extra = ''
            if (item.likes || item.comments || item.views) {
                extra = ` | 互动: 👍${item.likes || 0} 💬${item.comments || 0} 👁${item.views || 0}`
            }
            return `[${idx}] ${item.title || ''} (来源: ${item.source || ''}${extra})`
        })
        .join('\n')

    const userPrompt = HOT_TOPIC_SUMMARY_TEMPLATE
        .replace('{{scope}}', scope)
        .replace('{{itemsText}}', itemsText)

    try {
        const parsed = await callAiChat(
            [
                {role: 'system', content: '你是一个专业的热点分析师。请只返回JSON格式的结果。'},
                {role: 'user', content: userPrompt},
            ],
            0.5,
            4000
        )

        const topics = resolveAiContent(parsed)

        return topics.map((t) => ({
            title: (t.title || '').substring(0, 30),
            summary: t.summary || '',
            importance: t.importance || 5,
            credibilityPercentage: t.credibilityPercentage || 50,
            credibilityText: t.credibilityText || credibilityTextFromScore(t.credibilityPercentage || 50),
            reason: t.reason || '',
            scopeTags: t.scopeTags || [],
            sourceItems: t.sourceItems || [],
        }))
    } catch (err) {
        console.error(`[AI] 摘要热门话题异常，热点范围 "${scope}" (模型: ${model}):`, err.message)
        return []
    }
}

function getCredibilityTextFromScore(score) {
    return credibilityTextFromScore(score)
}

module.exports = {
    analyzeKeywordResults,
    summarizeHotTopics,
    buildAiAnalysis,
    getActiveModel,
    credibilityTextFromScore,
    getCredibilityTextFromScore,
    USE_LOCAL_AI,
    getOllamaStatus: ollamaAnalyzer.checkHealth,
    getOllamaModels: ollamaAnalyzer.getAllModels,
    getAvailableOllamaModels: ollamaAnalyzer.getAvailableModels,
}

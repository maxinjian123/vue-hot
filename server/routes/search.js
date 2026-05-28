const express = require('express');
const router = express.Router();
const crawler = require('../services/crawler');
const aiAnalyzer = require('../services/aiAnalyzer');

router.get('/', async (req, res) => {
    try {
        const {q, sources, ai_analysis} = req.query;

        if (!q || !q.trim()) {
            return res.json({data: [], total: 0, message: '请输入搜索关键词'});
        }

        const keyword = q.trim();
        const requestedSources = sources ? sources.split(',').map(s => s.trim()).filter(Boolean) : null;
        const enableAiAnalysis = ai_analysis !== 'false';

        console.log(`[Search] 关键词: "${keyword}" | AI分析: ${enableAiAnalysis}`);
        if (requestedSources) {
          console.log(`[Search] 指定数据源: [${requestedSources.join(', ')}]`);
        }

        let results = await crawler.searchKeywordSources(keyword, requestedSources);

        let deduped = deduplicateResults(results);
        deduped = deduped.filter(item => isValidSearchResult(item, keyword));

        if (deduped.length === 0) {
            return res.json({
                data: [],
                total: 0,
                keyword,
                suggestions: await generateSearchSuggestions(keyword),
                message: '未找到相关结果，建议更换关键词或稍后重试',
            });
        }

        let analyzedResults = deduped;
        let aiAnalysisInfo = null;

        if (enableAiAnalysis && deduped.length > 0) {
            try {
                console.log(`[Search] 开始AI分析，共 ${deduped.length} 条结果...`);
                const analysisStartTime = Date.now();

                analyzedResults = await aiAnalyzer.analyzeKeywordResults(keyword, deduped);
                const analysisTime = ((Date.now() - analysisStartTime) / 1000).toFixed(1);
                aiAnalysisInfo = {
                    enabled: true,
                    model:  await aiAnalyzer.getActiveModel() ? (await require('../models/Setting').findOne({where: {key: 'deepseek_model'}}))?.value : null,
                    analysisTime: `${analysisTime}s`,
                    totalAnalyzed: analyzedResults.length,
                    relevantCount: analyzedResults.filter(r => r.isRelevant !== false).length,
                };
                if (process.env.USE_LOCAL_AI) {
                    aiAnalysisInfo.model =  process.env.OLLAMA_DEFAULT_MODEL;
                }
                console.log(`[Search] AI分析完成，耗时 ${analysisTime}s`);
            } catch (aiError) {
                console.error('[Search] AI分析失败，使用基础排序:', aiError.message);
                analyzedResults = applyBasicSorting(deduped, keyword);
                aiAnalysisInfo = {
                    enabled: false,
                    error: aiError.message,
                    fallback: '基础排序',
                };
            }
        } else {
            analyzedResults = applyBasicSorting(deduped, keyword);
        }

        const finalResults = analyzedResults
            .sort((a, b) => {
                const scoreA = a.aiAnalysis?.importance || calculateRelevanceScore(a, keyword);
                const scoreB = b.aiAnalysis?.importance || calculateRelevanceScore(b, keyword);
                const relevantA = a.isRelevant !== false ? 1 : 0;
                const relevantB = b.isRelevant !== false ? 1 : 0;
                if (relevantA !== relevantB) return relevantB - relevantA;
                return scoreB - scoreA;
            })
            .slice(0, 50);

        const suggestions = await generateSearchSuggestions(keyword);

        res.json({
            data: finalResults,
            total: finalResults.length,
            keyword,
            suggestions,
            aiAnalysis: aiAnalysisInfo,
            message: finalResults.length === 0
                ? '未找到相关结果'
                : `找到 ${finalResults.length} 条相关结果${aiAnalysisInfo?.enabled ? '（已AI智能排序）' : ''}`,
        });
    } catch (err) {
        console.error('[Search] Error:', err.message);
        res.status(500).json({error: '搜索失败', message: err.message});
    }
});

router.get('/suggestions', async (req, res) => {
    try {
        const {q} = req.query;

        if (!q || q.trim().length < 1) {
            return res.json({suggestions: []});
        }

        const keyword = q.trim();
        const suggestions = await generateSearchSuggestions(keyword);

        res.json({suggestions, keyword});
    } catch (err) {
        console.error('[Search/Suggestions] Error:', err.message);
        res.status(500).json({error: '获取建议失败', message: err.message});
    }
});

async function generateSearchSuggestions(keyword) {
    const baseSuggestions = [];
    const hotKeywords = [
        'AI编程', '大模型', 'ChatGPT', 'GPT-4', 'DeepSeek',
        '机器学习', '深度学习', '自然语言处理', '计算机视觉',
        'Python', 'JavaScript', 'Vue', 'React', '前端开发',
        '区块链', 'Web3', '元宇宙', '自动驾驶',
        '芯片', '半导体', '新能源', '电动汽车',
        '医疗健康', '生物科技', '量子计算',
    ];

    const keywordLower = keyword.toLowerCase();

    for (const hot of hotKeywords) {
        if (hot.toLowerCase().includes(keywordLower) || keywordLower.includes(hot.toLowerCase())) {
            if (!baseSuggestions.includes(hot)) {
                baseSuggestions.push(hot);
            }
        }
    }

    const relatedTerms = generateRelatedTerms(keyword);
    for (const term of relatedTerms) {
        if (!baseSuggestions.includes(term) && baseSuggestions.length < 8) {
            baseSuggestions.push(term);
        }
    }

    return baseSuggestions.slice(0, 8);
}

function generateRelatedTerms(keyword) {
    const terms = [];
    const expansions = {
        'ai': ['人工智能', 'AI编程', 'AI工具', 'AI应用'],
        '编程': ['编程语言', '编程教程', '编程框架'],
        '模型': ['大模型', '语言模型', '预训练模型'],
        'vue': ['Vue3', 'Vue.js', 'Vite'],
        'react': ['React Native', 'React Hooks'],
        'python': ['Python教程', 'Python库', '数据分析'],
        '前端': ['前端框架', 'CSS', 'HTML5', 'TypeScript'],
        'gpt': ['GPT-4', 'ChatGPT', 'GPT API'],
    };

    const keywordLower = keyword.toLowerCase();
    for (const [key, values] of Object.entries(expansions)) {
        if (keywordLower.includes(key) || key.includes(keywordLower)) {
            terms.push(...values);
        }
    }

    if (terms.length === 0) {
        terms.push(`${keyword}`, `${keyword} 教程`, `${keyword} 最新`, `${keyword} 新闻`);
    }

    return terms.slice(0, 5);
}

function isValidSearchResult(item, keyword) {
    if (!item || !item.title || !item.title.trim()) return false;

    const titleLower = item.title.toLowerCase();
    const contentLower = (item.content || '').toLowerCase();
    const keywordLower = keyword.toLowerCase();

    const hasKeywordInTitle = titleLower.includes(keywordLower);
    const hasPartialMatch = keywordLower.split('').some(char =>
        titleLower.includes(char) && keywordLower.length > 1
    );
    const hasContentMatch = contentLower.includes(keywordLower) && contentLower.length > 20;

    if (!hasKeywordInTitle && !hasPartialMatch && !hasContentMatch) {
        return false;
    }

    if (item.title.trim().length < 3) return false;

    if (item.source === 'baidu_search' && !item.url) return false;

    if (item.content === item.title) return true;

    return true;
}

function calculateRelevanceScore(item, keyword) {
    let score = 0;
    const keywordLower = keyword.toLowerCase();
    const titleLower = (item.title || '').toLowerCase();
    const contentLower = (item.content || '').toLowerCase();

    if (titleLower.includes(keywordLower)) {
        score += 10;
        if (titleLower.indexOf(keywordLower) === 0) score += 5;
    }

    if (contentLower.includes(keywordLower)) score += 3;

    const words = keywordLower.split(/\s+/);
    for (const word of words) {
        if (word.length > 1 && titleLower.includes(word)) score += 2;
    }

    if (item.url && (item.url.includes('bilibili.com') || item.url.includes('twitter.com'))) score += 2;

    if (item.views > 1000) score += 1;
    if (item.likes > 100) score += 1;

    return score;
}

function applyBasicSorting(items, keyword) {
    return items.sort((a, b) => {
        const scoreA = calculateRelevanceScore(a, keyword);
        const scoreB = calculateRelevanceScore(b, keyword);
        return scoreB - scoreA;
    });
}

function deduplicateResults(items) {
    const seen = new Set();
    return items.filter(item => {
        const fingerprint = (item.title || '').replace(/\s+/g, '').toLowerCase().substring(0, 80);
        const urlFingerprint = (item.url || '').substring(0, 60);
        const key = `${fingerprint}|${urlFingerprint}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

module.exports = router;

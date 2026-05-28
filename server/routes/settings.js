const express = require('express');
const router = express.Router();
const { Setting } = require('../models');
const settingsCache = require('../services/settingsCache');
const aiAnalyzer = require('../services/aiAnalyzer');
const ollamaAnalyzer = require('../services/ollamaAnalyzer');

router.get('/', async (req, res) => {
  try {
    const settings = await settingsCache.getSettingsAsync();

    const aiConfig = {
      useLocalAI: aiAnalyzer.USE_LOCAL_AI,
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      ollamaDefaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'gemma3:4b',
      availableModels: ollamaAnalyzer.getAllModels(),
    };

    res.json({ success: true, data: { ...settings, aiConfig } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/ai/status', async (req, res) => {
  try {
    const ollamaStatus = await ollamaAnalyzer.checkHealth();
    const availableModels = await ollamaAnalyzer.getAvailableModels();

    res.json({
      success: true,
      data: {
        useLocalAI: aiAnalyzer.USE_LOCAL_AI,
        ollamaStatus,
        availableModels,
        currentModel: process.env.OLLAMA_DEFAULT_MODEL || 'gemma3:4b',
        configSource: 'environment',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/ai/models', async (req, res) => {
  try {
    const allModels = ollamaAnalyzer.getAllModels();
    const availableModels = await ollamaAnalyzer.getAvailableModels();

    res.json({
      success: true,
      data: {
        configured: allModels,
        available: availableModels,
        currentModel: process.env.OLLAMA_DEFAULT_MODEL || 'gemma3:4b',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const setting = await settingsCache.updateSettingAndInvalidate(key, value);

    res.json({
      success: true,
      data: setting,
      message: `设置 "${key}" 已更新为 "${value}"，所有客户端将自动刷新`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

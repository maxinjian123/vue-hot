const express = require('express');
const router = express.Router();
const { Keyword, HotTopic } = require('../models');

router.get('/', async (req, res) => {
  try {
    const keywords = await Keyword.findAll({ order: [['created_at', 'DESC']] });
    res.json({ success: true, data: keywords });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { word, crawl_frequency } = req.body;
    if (!word || !word.trim()) {
      return res.status(400).json({ success: false, error: '关键词不能为空' });
    }
    const freq = (crawl_frequency == null || crawl_frequency === '') ? null : parseInt(crawl_frequency);
    const keyword = await Keyword.create({ word: word.trim(), crawl_frequency: freq });
    res.json({ success: true, data: keyword });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { word, enabled, crawl_frequency } = req.body;
    const keyword = await Keyword.findByPk(id);
    if (!keyword) return res.status(404).json({ success: false, error: '关键词不存在' });
    if (word !== undefined) keyword.word = word;
    if (enabled !== undefined) keyword.enabled = enabled;
    if (crawl_frequency !== undefined) {
      keyword.crawl_frequency = (crawl_frequency == null || crawl_frequency === '') ? null : parseInt(crawl_frequency);
    }
    await keyword.save();
    res.json({ success: true, data: keyword });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const keyword = await Keyword.findByPk(id);
    if (!keyword) return res.status(404).json({ success: false, error: '关键词不存在' });
    await HotTopic.destroy({ where: { keyword_id: id } });
    await keyword.destroy();
    res.json({ success: true, message: '关键词已删除' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

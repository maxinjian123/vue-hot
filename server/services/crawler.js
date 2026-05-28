const axios = require('axios');
const cheerio = require('cheerio');
const { searchTweets } = require('./twitterSearch');
const settingsCache = require('./settingsCache');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function parseNumber(raw) {
  if (raw == null) return 0;
  const s = String(raw).replace(/[,，\s]/g, '');
  if (s.endsWith('万') || s.endsWith('w') || s.endsWith('W')) {
    const n = parseFloat(s);
    return isNaN(n) ? 0 : Math.round(n * 10000);
  }
  if (s.endsWith('亿')) {
    const n = parseFloat(s);
    return isNaN(n) ? 0 : Math.round(n * 100000000);
  }
  const n = parseInt(s);
  return isNaN(n) ? 0 : n;
}

function extractFirstImage(html) {
  if (!html) return null;
  const $ = cheerio.load(html);

  const img = $('img').first();
  if (img.length) {
    return img.attr('src') || img.attr('data-src') || img.attr('data-original') || null;
  }

  const videoPoster = $('video').first().attr('poster');
  if (videoPoster) return videoPoster;

  return null;
}

function extractVideoUrl(html) {
  if (!html) return null;
  const $ = cheerio.load(html);

  const videoSrc = $('video source').first().attr('src') || $('video').first().attr('src');
  if (videoSrc) return videoSrc;

  const iframe = $('iframe').first().attr('src');
  if (iframe) return iframe;

  return null;
}

async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': randomUA(), ...options.headers },
        ...options,
      });
      return resp.data;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function crawlBaidu(keyword) {
  try {
    const html = await fetchWithRetry('https://top.baidu.com/board?tab=realtime');
    const $ = cheerio.load(html);
    const items = [];

    $('.category-wrap_iQLoo').each((i, el) => {
      const titleEl = $(el).find('.c-single-text-ellipsis');
      const title = titleEl.text().trim();

      const hotEl = $(el).find('.hot-index_1Bl1a');
      const hotVal = hotEl.text().trim();

      const imgEl = $(el).find('img');
      const imgSrc = imgEl.first().attr('src') || imgEl.first().attr('data-src') || null;

      const iconEl = $(el).find('[class*="icon"], [class*="video"], [class*="img"]');
      const isVideo = iconEl.length > 0 && /video/i.test(iconEl.attr('class') || '');

      if (title) {
        items.push({
          title,
          source: 'baidu',
          url: `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
          views: parseNumber(hotVal),
          image_url: imgSrc || null,
          video_url: null,
          likes: 0,
          comments: 0,
          raw: {
            hot_index: hotVal || null,
            hot_num: parseNumber(hotVal),
            is_video: isVideo,
          },
        });
      }
    });
    return items.slice(0, 15);
  } catch (err) {
    console.error('[Crawler] Baidu 搜索失败:', err.message);
    return [];
  }
}

async function crawlWeibo(keyword) {
  try {
    const data = await fetchWithRetry('https://weibo.com/ajax/side/hotSearch', {
      headers: { Referer: 'https://weibo.com/' },
    });

    return (data.data?.realtime || []).slice(0, 15).map((item) => {
      const iconUrl = item.icon || item.pic || item.small_icon || null;
      const isVideo = (item.icon_desc || '').includes('视频') || (item.topic_flag || '').includes('video');
      const onboardTime = item.onboard_time ? new Date(item.onboard_time * 1000) : null;

      return {
        title: item.word || item.word_scheme || '',
        source: 'weibo',
        url: item.url || `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word || '')}`,
        image_url: iconUrl || item.pic || null,
        video_url: null,
        likes: parseNumber(item.num),
        comments: parseNumber(item.discuss_num || item.comment_num),
        views: parseNumber(item.read || item.readCount),
        publish_time: onboardTime,
        raw: {
          hot: item.num || 0,
          hot_num: parseNumber(item.num),
          category: item.category || '',
          rank: item.rank || 0,
          onboard_time: item.onboard_time || null,
          icon: item.icon || null,
          pic: item.pic || null,
          icon_desc: item.icon_desc || '',
          topic_flag: item.topic_flag || '',
          discuss_num: item.discuss_num || 0,
          read: item.read || 0,
          word_scheme: item.word_scheme || '',
          is_video: isVideo,
        },
      };
    });
  } catch (err) {
    console.error('[Crawler] Weibo 搜索失败:', err.message);
    return [];
  }
}

async function crawlBilibili(keyword) {
  try {
    const data = await fetchWithRetry('https://api.bilibili.com/x/web-interface/wbi/search/square?limit=30', {
      headers: { Referer: 'https://www.bilibili.com/' },
    });
    if (data.code !== 0) return [];

    return (data.data?.trending?.list || []).slice(0, 15).map((item) => ({
      title: item.title || item.show_name || '',
      source: 'bilibili',
      url: item.bvid ? `https://www.bilibili.com/video/${item.bvid}` : '',
      //video_url: item.bvid ? `https://www.bilibili.com/video/${item.bvid}` : null,
      video_url: item.bvid ? `//player.bilibili.com/player.html?isOutside=true&aid=${item.aid}&bvid=${item.bvid}&p=1` : null,
      image_url: item.pic || null,
      likes: parseNumber(item.stat?.like),
      comments: parseNumber(item.stat?.reply),
      views: parseNumber(item.stat?.view),
      raw: {
        bvid: item.bvid || '',
        aid: item.aid || 0,
        pic: item.pic || '',
        stat: item.stat || {},
        duration: item.duration || '',
        author: item.owner?.name || '',
        desc: item.desc || '',
      },
    }));
  } catch (err) {
    console.error('[Crawler] Bilibili 搜索失败:', err.message);
    return [];
  }
}

async function crawlTencent(keyword) {
  try {
    const data = await fetchWithRetry('https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=20', {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Origin': 'https://news.qq.com',
        'Referer': 'https://news.qq.com/',
      },
    });
    if (data && data.idlist && Array.isArray(data.idlist[0]?.newslist)) {
      return data.idlist[0].newslist.slice(0, 10).map((item) => {
        const ts = item.timestamp || item.publish_time || null;
        const publishTime = ts ? new Date(ts * 1000) : null;
        const authorName = item.source || item.author || item.mediaName || null;

        return {
          title: item.title || '',
          source: 'tencent',
          url: item.url || `https://new.qq.com/rain/a/${item.id}`,
          views: parseNumber(item.readCount),
          comments: parseNumber(item.commentNum || item.comment),
          likes: parseNumber(item.likeNum || item.like),
          video_url: item.video_url || item.videoUrl || null,
          image_url: item.pic || item.thumb_nail || item.image_url || null,
          publish_time: publishTime,
          author_name: authorName,
          raw: {
            hot: item.hotEvent?.heat || 0,
            readCount: item.readCount || 0,
            commentNum: item.commentNum || 0,
            likeNum: item.likeNum || 0,
            id: item.id || '',
            tag: item.tag || [],
            pic: item.pic || '',
            video_url: item.video_url || null,
            abstract: item.abstract || '',
            timestamp: ts,
            source: authorName,
          },
        };
      });
    }
    return [];
  } catch (err) {
    console.error('[Crawler] Tencent 搜索失败:', err.message);
    return [];
  }
}

function containsHttpHttps(str) {
  return /https?:\/\//i.test(str);
}

function parseRelativeDate(text) {
  if (!text) return null;
  const now = new Date();

  if (text === '今天') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (text === '昨天') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  const todayTimeMatch = text.match(/今天\s*(\d{1,2}):(\d{2})/);
  if (todayTimeMatch) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(todayTimeMatch[1]), parseInt(todayTimeMatch[2]));
  }

  const yesterdayTimeMatch = text.match(/昨天\s*(\d{1,2}):(\d{2})/);
  if (yesterdayTimeMatch) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, parseInt(yesterdayTimeMatch[1]), parseInt(yesterdayTimeMatch[2]));
  }

  const secMatch = text.match(/(\d+)\s*秒前/);
  if (secMatch) return new Date(now.getTime() - parseInt(secMatch[1]) * 1000);

  const minMatch = text.match(/(\d+)\s*分钟前/);
  if (minMatch) return new Date(now.getTime() - parseInt(minMatch[1]) * 60000);

  const hourMatch = text.match(/(\d+)\s*小时前/);
  if (hourMatch) return new Date(now.getTime() - parseInt(hourMatch[1]) * 3600000);

  const monthDayMatch = text.match(/(\d{2})月(\d{2})日/);
  if (monthDayMatch) return new Date(now.getFullYear(), parseInt(monthDayMatch[1]) - 1, parseInt(monthDayMatch[2]));

  const fullMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (fullMatch) return new Date(parseInt(fullMatch[1]), parseInt(fullMatch[2]) - 1, parseInt(fullMatch[3]));

  return null;
}
async function crawlSogou(keyword) {
  try {
    const html = await fetchWithRetry('https://www.sogou.com/web?query=' + encodeURIComponent(keyword) + '&ie=utf8');
    const $ = cheerio.load(html);
    const items = [];

    $('.results .rb, .vr-title, .result').each((i, el) => {
      const titleEl = $(el).find('h3 a, .vr-title a, a[class*="title"]').first();
      const title = titleEl.text().trim();
      let link = titleEl.attr('href') || $(el).find('a').first().attr('href') || '';

      const descEl = $(el).find('.str-text, .star-wiki, .space-txt, .abstract, [class*="summary"], [class*="desc"], p');
      const desc = descEl.first().text().trim();

      const citeEl = $(el).find('.cite, .source, [class*="source"], cite');
      const cite = citeEl.text().trim();

      const imgEl = $(el).find('img').first();
      const imgSrc = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-original') || null;

      let realUrl = null;

      if (link) {
        if (containsHttpHttps(link)) {
          realUrl = link;
        } else if (link.startsWith('/link?url=')) {
          realUrl = 'https://www.sogou.com' + link;
        } else if (link.startsWith('/web?') || link.startsWith('/web/')) {
          realUrl = 'https://www.sogou.com' + link;
        } else {
          const dataUrl = titleEl.attr('data-url') || $(el).attr('data-url');
          if (dataUrl && containsHttpHttps(dataUrl)) {
            realUrl = dataUrl;
          }
        }
      }

      if (title && title.length > 1) {
        const isVideoSource = /视频|video|影视|综艺|娱乐节目/i.test(cite)
        if (isVideoSource) {
          console.log(`[Crawler:搜狗] 过滤视频类结果: ${title.substring(0, 30)} (cite: ${cite})`)
          return
        }

        items.push({
          title,
          source: 'sogou',
          url: realUrl,
          source_url: realUrl,
          content: desc || title,
          image_url: imgSrc || null,
          video_url: null,
          likes: 0,
          comments: 0,
          views: 0,
          raw: {
            originalLink: link,
            realUrl,
            desc,
            cite,
            keyword,
            isRedirectLink: !!(link && link.startsWith('/link?url='))
          },
        });
      }
    });

    const resolvedItems = await Promise.all(
      items.map(async (item) => {
        if (item.raw.isRedirectLink && item.url) {
          try {
            const finalUrl = await resolveSogouRedirect(item.url);
            if (finalUrl && finalUrl !== item.url) {
              return { ...item, url: finalUrl, source_url: finalUrl };
            }
          } catch (err) {
            console.error('[Crawler] Sogou 重定向解析失败:', err.message);
          }
        }
        return item;
      })
    );

    return resolvedItems.slice(0, 3);
  } catch (err) {
    console.error('[Crawler] Sogou 搜索失败:', err.message);
    return [];
  }
}

async function resolveSogouRedirect(sogouUrl) {
  try {
    const resp = await axios.get(sogouUrl, {
      timeout: 8000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.sogou.com/',
      },
    });

    if (resp.request && resp.request.res && resp.request.res.responseUrl) {
      const finalUrl = resp.request.res.responseUrl;
      if (finalUrl && finalUrl !== sogouUrl && !finalUrl.includes('sogou.com/link')) {
        return finalUrl;
      }
    }

    if (resp.headers.location) {
      let location = resp.headers.location;
      if (!location.startsWith('http')) {
        location = 'https:' + location;
      }
      if (!location.includes('sogou.com/link')) {
        return location;
      }
    }

    const htmlMatch = typeof resp.data === 'string' && resp.data.match(/window\.location\.replace\s*\(\s*["']([^"']+)["']/);
    if (htmlMatch && htmlMatch[1]) {
      let jsUrl = htmlMatch[1];
      if (!jsUrl.startsWith('http')) {
        jsUrl = 'https:' + jsUrl;
      }
      return jsUrl;
    }

    const metaRefreshMatch = typeof resp.data === 'string' && resp.data.match(/http-equiv="refresh"[^>]*content="[^;]*;\s*url=([^"]+)"/i);
    if (metaRefreshMatch && metaRefreshMatch[1]) {
      let metaUrl = metaRefreshMatch[1];
      if (!metaUrl.startsWith('http')) {
        metaUrl = 'https:' + metaUrl;
      }
      return metaUrl;
    }

    return sogouUrl;
  } catch (err) {
    console.error('[Crawler] Sogou 重定向解析失败:', err.message);
    return null;
  }
}

async function crawlRSS(keyword) {
  const feeds = [
    'https://www.36kr.com/feed',
    'https://sspai.com/feed',
    'https://www.oschina.net/blog/rss',
  ];
  const items = [];
  for (const feed of feeds) {
    try {
      const xmlData = await fetchWithRetry(feed);
      const { parseString } = require('xml2js');
      const result = await new Promise((resolve, reject) => {
        parseString(xmlData, { explicitArray: false }, (err, r) => {
          if (err) reject(err);
          else resolve(r);
        });
      });
      const entries = result?.rss?.channel?.item || [];
      const list = (Array.isArray(entries) ? entries : [entries]).slice(0, 5);

      for (const entry of list) {
        const descHtml = entry.description || entry['content:encoded'] || entry.summary || '';
        const fullContent = entry['content:encoded'] || entry.description || entry.summary || '';

        let enclosureUrl = null;
        if (entry.enclosure) {
          const enc = Array.isArray(entry.enclosure) ? entry.enclosure[0] : entry.enclosure;
          if (enc) enclosureUrl = enc.url || null;
        }

        let mediaContentUrl = null;
        if (entry['media:content']) {
          const mc = Array.isArray(entry['media:content']) ? entry['media:content'][0] : entry['media:content'];
          if (mc) mediaContentUrl = mc.url || null;
        }

        items.push({
          title: entry.title || '',
          source: 'rss',
          url: entry.link || '',
          content: descHtml.substring(0, 500),
          image_url: extractFirstImage(descHtml) || enclosureUrl || mediaContentUrl || null,
          video_url: extractVideoUrl(fullContent) || null,
          likes: 0,
          comments: 0,
          views: 0,
          publish_time: entry.pubDate ? new Date(entry.pubDate) : null,
          author_name: entry.author || entry['dc:creator'] || null,
          raw: {
            feed_source: feed,
            pub_date: entry.pubDate || '',
            description: entry.description || '',
            author: entry.author || '',
            enclosure: enclosureUrl,
            media_content: mediaContentUrl,
          },
        });
      }
    } catch (err) {
      console.error(`[爬虫:RSS] RSS ${feed} 解析失败:`, err.message);
    }
  }
  return items;
}

async function crawlBingSearch(keyword) {
  try {
    const html = await fetchWithRetry(`https://www.bing.com/search?q=${encodeURIComponent(keyword)}&ensearch=1&tbs=qdr:d`, {
      headers: { 'Accept-Language': 'zh-CN,zh;q=0.9' },
    });
    const $ = cheerio.load(html);
    const items = [];

    $('#b_results .b_algo').each((i, el) => {
      const titleEl = $(el).find('h2 a').first();
      const title = titleEl.text().trim();
      const link = titleEl.attr('href') || '';

      const descEl = $(el).find('.b_caption p, .b_lineclamp2, .b_algoSlug');
      const desc = descEl.text().trim();

      const citeEl = $(el).find('.b_attribution cite, .b_attribution span');
      const cite = citeEl.text().trim();

      if (title) {
        items.push({
          title,
          source: 'bing',
          url: link,
          content: desc || title,
          image_url: null,
          video_url: null,
          likes: 0,
          comments: 0,
          views: 0,
          raw: { link, desc, cite, keyword },
        });
      }
    });

    return items.slice(0, 3);
  } catch (err) {
    console.error('[Crawler] Bing 搜索失败:', err.message);
    return [];
  }
}

async function crawlSo360(keyword) {
  try {
    const html = await fetchWithRetry(`https://www.so.com/s?q=${encodeURIComponent(keyword)}`);
    const $ = cheerio.load(html);
    const items = [];

    $('.result, .res-list').each((i, el) => {
      const titleEl = $(el).find('h3 a').first();
      const title = titleEl.text().trim();
      const link = titleEl.attr('href') || '';

      const descEl = $(el).find('.res-desc, .res-rich, .str-text, p');
      const desc = descEl.text().trim();

      const citeEl = $(el).find('.res-source, cite, [class*="source"], .res-info a');
      const cite = citeEl.text().trim();

      if (title) {
        const isBaike = /baike/i.test(cite) || /baike\.(so|360)\.com/i.test(link)
        if (isBaike) {
          console.log(`[Crawler:360] 过滤百科内容: ${title.substring(0, 30)} (cite: ${cite || '无'})`)
          return
        }

        items.push({
          title,
          source: 'so360',
          url: link,
          content: desc || title,
          image_url: null,
          video_url: null,
          likes: 0,
          comments: 0,
          views: 0,
          raw: { link, desc, cite, keyword },
        });
      }
    });

    return items.slice(0, 3);
  } catch (err) {
    console.error('[Crawler] 360 搜索失败:', err.message);
    return [];
  }
}

function parseBilibiliTimestamp(ts) {
  if (!ts) return null;
  const n = parseInt(ts);
  if (isNaN(n)) return null;
  return n > 1e12 ? new Date(n) : new Date(n * 1000);
}

async function crawlBilibiliSearch(keyword) {
  try {
    const data = await fetchWithRetry(
      `https://api.bilibili.com/x/web-interface/wbi/search/all/v2?keyword=${encodeURIComponent(keyword)}`,
      { headers: { Referer: 'https://www.bilibili.com/' } }
    );

    const items = [];
    const result = data?.data?.result || [];

    const ALLOWED_TYPES = ['video', 'article']

    for (const section of result) {
      const sectionType = (section.type || '').toLowerCase()

      // if (!ALLOWED_TYPES.includes(sectionType)) {
      //   const skippedCount = Array.isArray(section.data) ? section.data.length : 0
      //   if (skippedCount > 0) {
      //     console.log(`[Crawler:B站] 过滤非视频/专栏分区: ${sectionType} (跳过 ${skippedCount} 条)`)
      //   }
      //   continue
      // }

      const list = section?.data || [];
      let filteredInSection = 0

      for (const item of list.slice(0, 5)) {
        const badge = (item.badge || '').toString()
        const isPaid = /付费|大会员|充电|专属/.test(badge)
        const isElecHigh = item.rights && item.rights.elec_high_level

        if (isPaid || isElecHigh) {
          console.log(`[Crawler:B站] 过滤付费/大会员内容: ${(item.title || '').substring(0, 30)} (badge: ${badge})`)
          filteredInSection++
          continue
        }

        const authorName = item.author || item.owner?.name || '';
        const authorMid = item.mid || item.owner?.mid || '';

        items.push({
          title: item.title || '',
          source: 'bilibili_search',
          url: item.bvid ? `https://www.bilibili.com/video/${item.bvid}` : (item.url || ''),
          content: item.description || item.title || '',
          image_url: item.pic || item.cover || null,
          video_url: item.bvid ? `//player.bilibili.com/player.html?isOutside=true&aid=${item.aid}&bvid=${item.bvid}&p=1` : null,
          likes: parseInt(item.like || item.likes || 0) || 0,
          comments: parseInt(item.danmaku || item.comment || 0) || 0,
          views: parseInt(item.play || item.view || 0) || 0,
          publish_time: parseBilibiliTimestamp(item.pubdate),
          author_name: authorName,
          author_id: authorMid ? String(authorMid) : null,
          raw: {
            type: item.type || sectionType || '',
            bvid: item.bvid || '',
            aid: item.aid || 0,
            pic: item.pic || '',
            author: authorName,
            mid: authorMid,
            duration: item.duration || '',
            play: item.play || 0,
            danmaku: item.danmaku || 0,
            pubdate: item.pubdate || null,
          },
        });
      }

      if (filteredInSection > 0) {
        console.log(`[Crawler:B站] 分区 ${sectionType} 过滤付费内容: ${filteredInSection} 条`)
      }
    }

    return items.slice(0, 5);
  } catch (err) {
    console.error('[Crawler] Bilibili 搜索失败:', err.message);
    return [];
  }
}

async function crawlBaiduSearch(keyword) {
  try {
    const html = await fetchWithRetry(
      `https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}&rn=15`,
      { headers: { 'Accept-Language': 'zh-CN,zh;q=0.9' } }
    );
    const $ = cheerio.load(html);
    const items = [];

    $('.result, .result-op, .c-container').each((i, el) => {
      const titleEl = $(el).find('h3 a').first();
      const title = titleEl.text().trim();
      const link = titleEl.attr('href') || '';

      const descEl = $(el).find('.c-abstract, .c-span-last, .content-right_8Zs40, [class*="desc"]');
      const desc = descEl.text().trim() || $(el).text().trim().substring(0, 200);

      if (title) {
        items.push({
          title,
          source: 'baidu_search',
          url: link,
          content: desc || title,
          image_url: null,
          video_url: null,
          likes: 0,
          comments: 0,
          views: 0,
          raw: { link, desc, keyword },
        });
      }
    });

    return items.slice(0, 3);
  } catch (err) {
    console.error('[Crawler] Baidu 搜索失败:', err.message);
    return [];
  }
}

async function crawlWeiboSearch(keyword) {
  try {
    const html = await fetchWithRetry(
      `https://s.weibo.com/weibo?q=${encodeURIComponent(keyword)}&typeall=1&suball=1&timescope=custom:2days`,
      {
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Cookie': 'SUB=_2AkMRH3uAf8NxqwJRmP4UxWvhboh0wgjEieKk7dS8JRMxHRl-yT9kqk0QtRB6OtDV2gKpoXJZIBvPfkP30hWrgGQ8HvXU;',
        },
      }
    );
    const $ = cheerio.load(html);
    const items = [];

    $('.card-wrap').each((i, el) => {
      const titleEl = $(el).find('.txt').first();
      const rawText = titleEl.text().trim().replace(/\s+/g, ' ');
      const linkEl = $(el).find('.from a').first();
      const link = linkEl.attr('href') || '';

      const fromText = $(el).find('.from').text().trim();

      const dateMatch = (fromText || '').match(/(\d{4}-\d{2}-\d{2}|\d{2}月\d{2}日|\d{1,2}分钟前|\d{1,2}小时前|\d{1,2}秒前|今天|昨天)/);
      const publishTime = dateMatch ? parseRelativeDate(dateMatch[0]) : null;

      if (rawText && rawText.length > 2) {
        items.push({
          title: rawText.substring(0, 100),
          source: 'weibo_search',
          url: link ? (link.startsWith('http') ? link : `https:${link}`) : `https://s.weibo.com/weibo?q=${encodeURIComponent(keyword)}`,
          content: rawText.substring(0, 300),
          image_url: null,
          video_url: null,
          likes: 0,
          comments: 0,
          views: 0,
          publish_time: publishTime,
          raw: { text: rawText, link, from: fromText, keyword },
        });
      }
    });

    return items.slice(0, 3);
  } catch (err) {
    console.error('[Crawler] Weibo 搜索失败:', err.message);
    return [];
  }
}

// 知乎
async function crawlZhihuSearch(keyword) {
  try {
    const resp = await axios.get(
      'https://api.zhihu.com/topstory/hot-lists/total?limit=50',
      {
        headers: {
          'User-Agent': randomUA(),
          'Accept': 'application/json',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Referer': 'https://www.zhihu.com/hot',
        },
        timeout: 15000,
      }
    );

    const allItems = [];
    const data = resp.data?.data || [];

    for (const card of data) {
      const target = card.target || {};
      const title = target.title || target.excerpt || '';
      const questionId = target.id || '';

      if (!title || !title.trim()) continue;

      const url = target.url
        ? (target.url).replace('https://api.zhihu.com/questions/', 'https://www.zhihu.com/question/')
        : (questionId ? `https://www.zhihu.com/question/${questionId}` : '');

      const metrics = target.metrics || target.visit_count || {};
      const votes = parseInt(metrics.upvote_count || metrics.vote_count || target.voteup_count || 0) || 0;
      const answers = parseInt(metrics.answer_count || target.answer_count || 0) || 0;
      const followers = parseInt(metrics.follower_count || target.follower_count || 0) || 0;
      const excerpt = target.excerpt || target.detail_text || card.detail_text || '';

      allItems.push({
        title: title.length > 50 ? title.substring(0, 50) : title,
        source: 'zhihu',
        url,
        content: excerpt || '',
        likes: votes,
        comments: answers,
        views: followers,
        publish_time: target.created ? new Date(target.created * 1000) : null,
        author_name: target.author?.name || '',
        author_profile_picture: target.author?.avatar_url || '',
        image_url: card.children?.[0]?.thumbnail || null,
        raw: {
          question_id: questionId,
          type: target.type || card.type || '',
          excerpt,
          votes,
          answers,
          followers,
          detail_text: card.detail_text || '',
          keyword,
        },
      });
    }

    const keywordLower = (keyword || '').toLowerCase();
    const matches = allItems.filter(item => {
      const text = (item.title + ' ' + (item.content || '')).toLowerCase();
      return text.includes(keywordLower);
    });

    if (matches.length > 0) {
      console.log(`[Crawler:知乎] 热搜 "${keyword}" 匹配 ${matches.length} 条 (总数 ${allItems.length})`);
      return matches.slice(0, 5);
    }

    console.log(`[Crawler:知乎] 热搜 "${keyword}" 无匹配，跳过`);
    return [];
  } catch (err) {
    console.error('[Crawler] Zhihu 热搜获取失败:', err.message);
    return [];
  }
}

// 掘金 - 使用搜索API获取关键词相关文章
async function crawlJuejinSearch(keyword) {
  try {
    const resp = await axios.get('https://api.juejin.cn/search_api/v1/search', {
      params: {
        key_word: keyword,
        page: 0,
        page_size: 15,
        sort: 'relevance',
        type: 0
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'User-Agent': randomUA(),
        'Referer': 'https://juejin.cn/search?query=' + encodeURIComponent(keyword),
        'Origin': 'https://juejin.cn'
      },
      timeout: 15000
    });

    const items = [];
    const data = resp.data?.data || [];

    for (const rawItem of data) {
      const model = rawItem.result_model || rawItem.item_info || rawItem;
      const info = model.article_info || model;
      const title = info.title || '';
      const desc = info.brief_content || info.brief || '';
      const articleId = info.article_id || model.article_id || '';

      if (!title || !title.trim()) continue;

      const authorInfo = rawItem.author_user_info || model.author_user_info || {};

      items.push({
        title: title.substring(0, 150),
        source: 'juejin',
        url: articleId ? `https://juejin.cn/post/${articleId}` : '',
        content: desc || title,
        likes: parseInt(info.digg_count) || 0,
        comments: parseInt(info.comment_count) || 0,
        views: parseInt(info.view_count) || 0,
        publish_time: info.rtime ? new Date(parseInt(info.rtime) * 1000) : (info.ctime ? new Date(parseInt(info.ctime) * 1000) : null),
        image_url: info.cover_image || null,
        author_name: authorInfo.user_name || '',
        author_id: authorInfo.user_id ? String(authorInfo.user_id) : null,
        raw: {
          article_id: articleId,
          brief_content: desc,
          digg_count: info.digg_count || 0,
          comment_count: info.comment_count || 0,
          view_count: info.view_count || 0,
          ctime: info.ctime || '',
          category_id: info.category_id || '',
          tag_ids: info.tag_ids || [],
          cover_image: info.cover_image || '',
          author: authorInfo.user_name || ''
        }
      });
    }

    console.log(`[Crawler:掘金] 搜索 "${keyword}" 返回 ${items.length} 条`);
    return items.slice(0, 5);
  } catch (err) {
    console.error('[Crawler] 掘金搜索失败:', err.message);
    return [];
  }
}
// csdn
async function crawlCsdnSearch(keyword) {
  try {
    const resp = await axios.get('https://so.csdn.net/api/v3/search', {
      params: {
        q: keyword,
        t: 'all',
        p: 1,
        size: 15,
      },
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://so.csdn.net/',
      },
      timeout: 15000,
    });

    const items = [];
    const resultVos = resp.data?.result_vos || [];

    for (const item of resultVos) {
      if (!item['vip_view_auth'] || item['vip_view_auth'] !== '0') {
        continue;
      }

      const title = (item.title || '').replace(/<[^>]+>/g, '').trim();
      const desc = (item.description || '').replace(/<[^>]+>/g, '').trim();

      if (!title || title.length < 2) continue;

      items.push({
        title: title.length > 50 ? title.substring(0, 50) : title,
        source: 'csdn',
        url: item.url || '',
        content: item.body || item.description,
        likes: Number(item.digg) || 0,
        views: Number(item.view) || item.view_num || 0,
        comments: item.comment || 0,
        publish_time: item.create_time_str || "",
        author_name: item.nickname || '',
        raw: {
          article_id: item.articleid || '',
          description: desc,
          digg: item.digg || '0',
          view: item.view || item.view_num || '0',
          comment: item.comment || '0',
          create_time: item.create_time_str || '',
          created_at: item.created_at || '',
          type: item.type || '',
          language: item.language || '',
        },
      });
    }

    const keywordLower = (keyword || '').toLowerCase();
    const matches = items.filter(item => {
      const text = (item.title + ' ' + (item.content || '')).toLowerCase();
      return text.includes(keywordLower);
    });

    if (matches.length > 0) {
      console.log(`[Crawler:CSDN] 匹配关键词 "${keyword}" ${matches.length} 条 (总数 ${items.length}，已滤付费)`);
      return matches.slice(0, 5);
    }

    console.log(`[Crawler:CSDN] "${keyword}" 无精确匹配，跳过`);
    return [];
  } catch (err) {
    console.error('[Crawler] CSDN 搜索失败:', err.message);
    return [];
  }
}
// 开源中国
async function crawlOschinaSearch(keyword) {
  try {
    const html = await fetchWithRetry('https://www.oschina.net/news');
    const $ = cheerio.load(html);
    const allItems = [];

    $('.news-item').each((i, el) => {
      const dataUrl = $(el).attr('data-url') || '';
      const title = $(el).find('.header .title').text().trim();
      const desc = $(el).find('.description .line-clamp').text().trim() ||
        $(el).find('.description').text().trim();

      if (!title || title.length < 2) return;

      const extraItems = $(el).find('.extra .extraOptionList .item');
      let author = '';
      let pubTime = null;
      let commentCount = 0;

      extraItems.each((j, itemEl) => {
        const text = $(itemEl).text().replace(/\s+/g, ' ').trim();
        if (j === 0) {
          const dotIdx = text.indexOf('·');
          if (dotIdx >= 0) {
            author = text.substring(0, dotIdx).trim();
            pubTime = parseRelativeDate(text.substring(dotIdx + 1).trim());
          } else {
            author = text;
          }
        } else if (j === 1) {
          commentCount = parseInt(text) || 0;
        }
      });

      const imgEl = $(el).find('a.ui.small.image img');
      let imageUrl = imgEl.attr('src') || '';
      if (imageUrl && imageUrl.includes('loadf0da82b3')) {
        imageUrl = '';
      }

      const imgLink = $(el).find('a.ui.small.image').attr('href') || '';
      const url = dataUrl || imgLink || '';

      allItems.push({
        title: title.substring(0, 200),
        source: 'oschina',
        url,
        content: desc || title,
        likes: 0,
        comments: commentCount,
        views: 0,
        publish_time: pubTime,
        author_name: author,
        image_url: imageUrl || null,
        raw: {
          data_url: dataUrl,
          description: desc,
          author,
          comment_count: commentCount,
        },
      });
    });

    const keywordLower = (keyword || '').toLowerCase();
    const matches = allItems.filter(item => {
      const text = (item.title + ' ' + (item.content || '')).toLowerCase();
      return text.includes(keywordLower);
    });

    if (matches.length === 0) {
      console.log(`[Crawler:开源中国] 新闻列表 "${keyword}" 无匹配，跳过`);
      return [];
    }

    console.log(`[Crawler:开源中国] 新闻列表匹配 "${keyword}" ${matches.length} 条 (总数 ${allItems.length})，提取详情...`);
    const topMatches = matches.slice(0, 5);

    for (const item of topMatches) {
      if (!item.url) continue;
      try {
        const detailHtml = await fetchWithRetry(item.url);
        const $detail = cheerio.load(detailHtml);

        const editorContent = $detail('.editor').text().replace(/\s+/g, ' ').trim();
        if (editorContent) {
          item.content = editorContent.substring(0, 5000);
          console.log(`[Crawler:开源中国] 详情提取 "${item.title.substring(0, 30)}" | 内容 ${editorContent.length} 字符`);
        }

        const infoItems = $detail('.news-content-info .ant-space-item').map((i, el) => $detail(el).text().replace(/\s+/g, ' ').trim()).get();

        if (infoItems.length >= 4) {
          item.views = parseInt(infoItems[3].replace(/[^0-9]/g, '')) || 0;
        }
        if (infoItems.length >= 5) {
          item.comments = parseInt(infoItems[4].replace(/[^0-9]/g, '')) || 0;
        }
        if (infoItems.length >= 2) {
          item.author_name = infoItems[1].replace(/编辑:/, '').trim() || item.author_name;
        }
        if (infoItems.length >= 3 && infoItems[2]) {
          const d = new Date(infoItems[2]);
          if (!isNaN(d.getTime())) item.publish_time = d;
        }
      } catch (e) {
        console.log(`[Crawler:开源中国] 提取 "${item.title.substring(0, 30)}" 失败:`, e.message);
      }
    }

    return topMatches;
  } catch (err) {
    console.error('[Crawler] OSChina HTML 解析失败:', err.message);
    return [];
  }
}

async function searchKeywordSources(keyword, requestedSources = null) {
  const keywordStr = keyword || 'AI';
  const startTime = Date.now();

  const sources = [
    {
      name: 'twitter', fn: async () => {
        const result1 = await searchTweets(keywordStr, { maxResults: 20 })
        const items = result1.items || []
        if (items.length < 5 && result1.next_cursor) {
          const result2 = await searchTweets(keywordStr, { cursor: result1.next_cursor, maxResults: 20 })
          const page2 = result2.items || []
          const seenIds = new Set(items.map(t => t.tweet_id))
          for (const t of page2) {
            if (!seenIds.has(t.tweet_id)) {
              items.push(t)
              seenIds.add(t.tweet_id)
            }
          }
        }
        return items.filter(item => item.title && item.title.trim())
      }
    },
    {
      name: 'bing', fn: async () => {
        const results = await crawlBingSearch(keywordStr);
        return results.filter(item => item.title && item.title.trim() && item.content && item.content.trim() !== item.title.trim());
      }
    },
    {
      name: 'so360', fn: async () => {
        const results = await crawlSo360(keywordStr);
        return results.filter(item => item.title && item.title.trim());
      }
    },
    {
      name: 'bilibili_search', fn: async () => {
        const results = await crawlBilibiliSearch(keywordStr);
        return results.filter(item => item.title && item.title.trim());
      }
    },
    {
      name: 'sogou', fn: async () => {
        const results = await crawlSogou(keywordStr);
        return results.filter(item => item.title && item.title.trim() && item.url && item.url.startsWith('http'));
      }
    },
    {
      name: 'baidu_search', fn: async () => {
        const results = await crawlBaiduSearch(keywordStr);
        return results.filter(item => item.title && item.title.trim() && item.content && item.content.length > 10);
      }
    },
    {
      name: 'weibo_search', fn: async () => {
        const results = await crawlWeiboSearch(keywordStr);
        return results.filter(item => item.title && item.title.trim() && item.title.length > 5);
      }
    },
    {
      name: 'zhihu', fn: async () => {
        const results = await crawlZhihuSearch(keywordStr);
        return results.filter(item => item.title && item.title.trim());
      }
    },
    {
      name: 'juejin', fn: async () => {
        const results = await crawlJuejinSearch(keywordStr);
        return results.filter(item => item.title && item.title.trim());
      }
    },
    {
      name: 'csdn', fn: async () => {
        const results = await crawlCsdnSearch(keywordStr);
        return results.filter(item => item.title && item.title.trim());
      }
    },
    {
      name: 'oschina', fn: async () => {
        const results = await crawlOschinaSearch(keywordStr);
        return results.filter(item => item.title && item.title.trim());
      }
    },
  ];

  let activeSources;

  if (requestedSources && requestedSources.length > 0) {
    activeSources = sources.filter(s => requestedSources.includes(s.name));
    console.log(`[Crawler:关键词] 手动搜索模式，跳过设置表过滤 | 指定数据源: [${requestedSources.join(', ')}]`);
  } else {
    activeSources = sources;
    activeSources = activeSources.filter(s => {
      const enabled = settingsCache.getSetting(`crawl_source_${s.name}`, 'true') === 'true'
      if (!enabled) {
        console.log(`[Crawler:关键词] ⏭️ ${s.name} 已禁用（定时任务），跳过`)
      }
      return enabled
    });
  }

  if (activeSources.length === 0) {
    console.log(`[Crawler:关键词] ⚠️ 指定的数据源不在可用列表中: [${requestedSources.join(', ')}]`)
    console.log(`[Crawler:关键词] 可用数据源: [${sources.map(s => s.name).join(', ')}]`)
    return []
  }

  const MAX_CONCURRENT = 4;
  console.log(`[Crawler:关键词] 开始并行搜索 "${keywordStr}" | 数据源: ${activeSources.length}个 | 并发数: ${MAX_CONCURRENT}`);
  if (requestedSources && requestedSources.length > 0) {
    console.log(`[Crawler:关键词] 指定数据源: [${requestedSources.join(', ')}]`);
  }

  const results = [];
  const executionLog = [];

  async function processSource(source) {
    const sourceStartTime = Date.now();
    try {
      console.log(`[Crawler:关键词] ⏳ 开始获取 ${source.name}...`);
      const items = await source.fn();
      const elapsed = ((Date.now() - sourceStartTime) / 1000).toFixed(1);

      const processedItems = items
        .filter(item => item.title && item.title.trim())
        .map(item => ({
          ...item,
          content: (item.content && item.content.trim() !== item.title.trim()) ? item.content : '',
          url: validateAndFixUrl(item.url, item.source),
        }));

      console.log(`[Crawler:关键词] ✅ ${source.name} 完成 (${elapsed}s) | 获取 ${processedItems.length} 条`);
      executionLog.push({ source: source.name, status: 'success', count: processedItems.length, time: `${elapsed}s` });

      return processedItems;
    } catch (err) {
      const elapsed = ((Date.now() - sourceStartTime) / 1000).toFixed(1);
      console.error(`[Crawler:关键词] ❌ ${source.name} 失败 (${elapsed}s):`, err.message);
      executionLog.push({ source: source.name, status: 'error', error: err.message, time: `${elapsed}s` });
      return [];
    }
  }

  async function runWithConcurrency(tasks, maxConcurrent) {
    const results = [];
    const executing = new Set();

    for (const task of tasks) {
      const promise = task().then(result => {
        executing.delete(promise);
        return result;
      });

      executing.add(promise);
      results.push(promise);

      if (executing.size >= maxConcurrent) {
        await Promise.race(executing);
      }
    }

    return Promise.allSettled(results);
  }

  const tasks = activeSources.map(source => () => processSource(source));
  const settledResults = await runWithConcurrency(tasks, MAX_CONCURRENT);

  let totalCount = 0;
  let successCount = 0;

  for (const settled of settledResults) {
    if (settled.status === 'fulfilled') {
      results.push(...settled.value);
      totalCount += settled.value.length;
      successCount++;
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Crawler:关键词] 🎉 并行搜索完成 | 总耗时: ${totalTime}s | 成功: ${successCount}/${activeSources.length} | 结果: ${totalCount}条`);
  console.log(`[Crawler:关键词] 📊 执行详情:`, JSON.stringify(executionLog));

  return results;
}

function validateAndFixUrl(url, source) {
  if (!url) return null;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('//')) {
    return 'https:' + url;
  }

  if (source === 'baidu_search') {
    try {
      const decodedUrl = decodeURIComponent(url);
      if (decodedUrl.startsWith('http')) {
        const match = decodedUrl.match(/http[^&\\]+/);
        return match ? match[0] : null;
      }
    } catch (e) {
      return null;
    }
  }

  if (source === 'sogou' && url.startsWith('/link?url=')) {
    return 'https://www.sogou.com' + url;
  }

  if ((source === 'sogou' || source === 'baidu_search') && url.startsWith('/web')) {
    const domain = source === 'sogou' ? 'https://www.sogou.com' : 'https://www.baidu.com';
    return domain + url;
  }

  return null;
}

async function searchDiscoverySources(scope) {
  const sources = [
    { name: 'baidu_hotlist', fn: () => crawlBaidu(scope) },
    { name: 'weibo_hotlist', fn: () => crawlWeibo(scope) },
    { name: 'bilibili_hotlist', fn: () => crawlBilibili(scope) },
    { name: 'tencent_news', fn: () => crawlTencent(scope) },
    { name: 'rss', fn: () => crawlRSS(scope) },
  ];

  const results = [];
  for (const source of sources) {
    try {
      console.log(`[爬虫:热点] 获取 ${source.name}...`);
      const items = await source.fn();
      for (const item of items) {
        results.push({
          ...item,
          content: item.content || item.title,
        });
      }
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[爬虫:热点] ${source.name} 失败:`, err.message);
    }
  }

  return results;
}

async function searchAllSources(keyword) {
  return searchDiscoverySources(keyword);
}

module.exports = {
  crawlBaidu,
  crawlWeibo,
  crawlBilibili,
  crawlTencent,
  crawlSogou,
  crawlRSS,
  crawlBingSearch,
  crawlSo360,
  crawlBilibiliSearch,
  crawlBaiduSearch,
  crawlWeiboSearch,
  crawlZhihuSearch,
  crawlJuejinSearch,
  crawlCsdnSearch,
  crawlOschinaSearch,
  searchAllSources,
  searchKeywordSources,
  searchDiscoverySources,
};

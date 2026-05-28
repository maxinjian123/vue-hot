const axios = require('axios');

const TWITTER_API_KEY = 'new1_fd5db722c1eb4913b67ebe120a78a541';
const TWITTER_API_BASE = 'https://api.twitterapi.io';

function safeStr(v) {
  if (v == null) return null;
  return String(v);
}

function safeInt(v) {
  const n = parseInt(v);
  return isNaN(n) ? 0 : n;
}

function safeBool(v) {
  return !!v;
}

function safeDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function mapTweetToItem(tweet) {
  const author = tweet.author || {};

  let tweetImageUrl = null;
  let tweetVideoUrl = null;

  if (tweet.entities && tweet.entities.urls) {
    for (const u of tweet.entities.urls) {
      const expanded = (u.expanded_url || u.url || '').toLowerCase();
      if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(expanded)) {
        tweetImageUrl = u.expanded_url || u.url;
      } else if (/twitter\.com\/.*\/video\//i.test(expanded) || /\/video\//i.test(expanded)) {
        tweetVideoUrl = u.expanded_url || u.url;
      } else if (/\.mp4(\?|$)/i.test(expanded)) {
        tweetVideoUrl = u.expanded_url || u.url;
      }
    }
  }

  if (!tweetImageUrl && tweet.entities && tweet.entities.media) {
    for (const m of (Array.isArray(tweet.entities.media) ? tweet.entities.media : [tweet.entities.media])) {
      if (m && m.type === 'photo') tweetImageUrl = m.media_url_https || m.media_url || m.url;
      if (m && (m.type === 'video' || m.type === 'animated_gif')) {
        tweetVideoUrl = m.expanded_url || m.url;
      }
    }
  }

  return {
    title: (tweet.text || '').substring(0, 100),
    content: tweet.text || '',

    likes: safeInt(tweet.likeCount),
    comments: safeInt(tweet.replyCount),
    views: safeInt(tweet.viewCount),

    source: 'twitter',
    url: tweet.url || (tweet.id ? `https://x.com/i/status/${tweet.id}` : ''),
    source_url: tweet.url || (tweet.id ? `https://x.com/i/status/${tweet.id}` : ''),

    video_url: tweetVideoUrl,
    image_url: tweetImageUrl || (author.profilePicture || null),

    tweet_id: safeStr(tweet.id),
    retweet_count: safeInt(tweet.retweetCount),
    quote_count: safeInt(tweet.quoteCount),
    bookmark_count: safeInt(tweet.bookmarkCount),
    tweet_created_at: safeDate(tweet.createdAt),
    tweet_lang: safeStr(tweet.lang),
    is_reply: safeBool(tweet.isReply),
    in_reply_to_id: safeStr(tweet.inReplyToId),
    conversation_id: safeStr(tweet.conversationId),
    is_limited_reply: safeBool(tweet.isLimitedReply),

    author_user_name: safeStr(author.userName),
    author_name: safeStr(author.name),
    author_id: safeStr(author.id),
    author_verified: safeBool(author.isBlueVerified),
    author_verified_type: safeStr(author.verifiedType),
    author_followers: safeInt(author.followers),
    author_following: safeInt(author.following),
    author_profile_picture: safeStr(author.profilePicture),
    author_cover_picture: safeStr(author.coverPicture),
    author_description: safeStr(author.description),
    author_location: safeStr(author.location),
    author_created_at: safeDate(author.createdAt),
    author_favourites_count: safeInt(author.favouritesCount),
    author_statuses_count: safeInt(author.statusesCount),
    author_media_count: safeInt(author.mediaCount),
    is_possibly_sensitive: safeBool(author.possiblySensitive),

    raw: {
      type: tweet.type,
      id: tweet.id,
      url: tweet.url,
      text: tweet.text,
      source: tweet.source,
      retweetCount: tweet.retweetCount,
      replyCount: tweet.replyCount,
      likeCount: tweet.likeCount,
      quoteCount: tweet.quoteCount,
      viewCount: tweet.viewCount,
      createdAt: tweet.createdAt,
      lang: tweet.lang,
      bookmarkCount: tweet.bookmarkCount,
      isReply: tweet.isReply,
      inReplyToId: tweet.inReplyToId,
      conversationId: tweet.conversationId,
      displayTextRange: tweet.displayTextRange,
      inReplyToUserId: tweet.inReplyToUserId,
      inReplyToUsername: tweet.inReplyToUsername,
      isLimitedReply: tweet.isLimitedReply,
      entities: tweet.entities || {},
      quoted_tweet: tweet.quoted_tweet || null,
      retweeted_tweet: tweet.retweeted_tweet || null,
      author: {
        type: author.type,
        userName: author.userName,
        url: author.url,
        id: author.id,
        name: author.name,
        isBlueVerified: author.isBlueVerified,
        verifiedType: author.verifiedType,
        profilePicture: author.profilePicture,
        coverPicture: author.coverPicture,
        description: author.description,
        location: author.location,
        followers: author.followers,
        following: author.following,
        canDm: author.canDm,
        createdAt: author.createdAt,
        favouritesCount: author.favouritesCount,
        hasCustomTimelines: author.hasCustomTimelines,
        isTranslator: author.isTranslator,
        mediaCount: author.mediaCount,
        statusesCount: author.statusesCount,
        withheldInCountries: author.withheldInCountries,
        affiliatesHighlightedLabel: author.affiliatesHighlightedLabel,
        possiblySensitive: author.possiblySensitive,
        pinnedTweetIds: author.pinnedTweetIds,
        isAutomated: author.isAutomated,
        automatedBy: author.automatedBy,
        unavailable: author.unavailable,
        message: author.message,
        unavailableReason: author.unavailableReason,
        profile_bio: author.profile_bio || {},
      },
    },
  };
}

function isAccountName(keyword) {
  if (!keyword || typeof keyword !== 'string') return false;
  const trimmed = keyword.trim();
  if (trimmed.startsWith('@')) return true;
  if (/^[a-zA-Z_]\w{2,30}$/.test(trimmed)) return true;
  return false;
}

function filterTweet(item) {
  if (item.is_reply) return false;

  if (item.raw && item.raw.retweeted_tweet) return false;

  if (item.raw && item.raw.quoted_tweet) return false;

  const likes = item.likes || 0;
  const retweets = item.retweet_count || 0;
  const views = item.views || 0;

  if (likes >= 3 || retweets >= 1 || views >= 100) return true;

  return false;
}

function filterTweets(items) {
  const kept = [];
  const dropped = [];
  for (const item of items) {
    if (filterTweet(item)) {
      kept.push(item);
    } else {
      dropped.push(item);
    }
  }
  if (dropped.length > 0) {
    console.log(`[Twitter] 预过滤: 保留 ${kept.length} 条高质量推文，丢弃 ${dropped.length} 条低质量推文`);
  }
  return kept;
}

async function searchTweets(keyword, options = {}) {
  const { sinceTime, untilTime, cursor, maxResults = 20 } = options;
  const isAccount = isAccountName(keyword);
  const effectiveKeyword = isAccount ? keyword.replace(/^@/, '') : keyword;

  let queryStr = effectiveKeyword;
  const fromQuery = `from:${effectiveKeyword}`;

  let allItems = [];
  let hasNext = false;
  let nextCursor = '';

  try {
    const params = {
      query: queryStr || 'AI',
      queryType: 'Latest',
    };
    if (sinceTime) params.sinceTime = sinceTime;
    if (untilTime) params.untilTime = untilTime;
    if (cursor) params.cursor = cursor;

    const resp = await axios.get(`${TWITTER_API_BASE}/twitter/tweet/advanced_search`, {
      params,
      headers: {
        'X-API-Key': TWITTER_API_KEY,
      },
      timeout: 15000,
    });

    const tweets = resp.data?.tweets || [];
    allItems = tweets.slice(0, maxResults).map(mapTweetToItem);

    hasNext = resp.data?.has_next_page || false;
    nextCursor = resp.data?.next_cursor || '';
    console.log(`[Twitter] 搜索: ${queryStr || 'AI'}, 找到 ${tweets.length} 条推文`);
  } catch (err) {
    console.error('[Twitter] 搜索失败:', err.message);
  }

  if (isAccount) {
    try {
      console.log(`[Twitter] 检测到账号，也搜索 from:${effectiveKeyword}`);
      const fromParams = {
        query: fromQuery,
        queryType: 'Latest',
      };
      if (sinceTime) fromParams.sinceTime = sinceTime;
      if (untilTime) fromParams.untilTime = untilTime;

      const fromResp = await axios.get(`${TWITTER_API_BASE}/twitter/tweet/advanced_search`, {
        params: fromParams,
        headers: {
          'X-API-Key': TWITTER_API_KEY,
        },
        timeout: 15000,
      });

      const fromTweets = (fromResp.data?.tweets || []).map(mapTweetToItem);
      const seenIds = new Set(allItems.map((t) => t.tweet_id));
      for (const t of fromTweets) {
        if (!seenIds.has(t.tweet_id)) {
          allItems.push(t);
          seenIds.add(t.tweet_id);
        }
      }
      console.log(`[Twitter] 从 ${effectiveKeyword} 搜索到 ${fromTweets.length} 条推文，去重后总数: ${allItems.length}`);
    } catch (err) {
      console.error(`[Twitter] 从 ${effectiveKeyword} 搜索失败:`, err.message);
    }
  }

  const filteredItems = filterTweets(allItems);

  return {
    items: filteredItems,
    has_next_page: hasNext,
    next_cursor: nextCursor,
  };
}

module.exports = { searchTweets, mapTweetToItem, filterTweets, isAccountName };

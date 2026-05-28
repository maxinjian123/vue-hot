<template>
  <div class="bento-grid">
    <div class="bento-card span-4">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          {{ topicScope ? `热点范围: ${topicScope}` : '最新热点' }}
        </div>
        <div style="display: flex; align-items: center; gap: 8px">
          <span v-if="topicScope" class="badge badge-amber" style="cursor: pointer" @click="resetTopicFilters" title="清除范围"> 清除 ✕ </span>
          <button class="btn btn-sm btn-success" @click="doExport('excel')" title="导出Excel">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            导出
          </button>
          <span class="text-muted" style="font-size: 0.72rem">{{ topicTotal }} 条结果</span>
          <button class="btn btn-sm" @click="resetTopicFilters" title="重置过滤">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>

      <div class="quick-action-bar" style="margin-bottom: 12px">
        <input v-model="searchKeyword" class="input-field" placeholder="输入关键词搜索热点（标题/内容/范围）" style="min-width: 220px; flex: 1" @keyup.enter="searchByKeyword(searchKeyword)" />
        <button class="btn btn-primary" @click="searchByKeyword(searchKeyword)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          搜索
        </button>
      </div>

      <FilterBar
        :model-value="{
          sort: topicSort,
          source: topicFilters.source,
          min_importance: topicFilters.min_importance,
          author_verified: topicFilters.author_verified,
          has_image: topicFilters.has_image,
          has_video: topicFilters.has_video,
          has_link: topicFilters.has_link
        }"
        :sort-options="sortOpts"
        :source-options="store.sources"
        :importance-options="importanceOpts"
        :media-options="mediaOpts"
        :show-verified-toggle="true"
        :source-label-fn="store.sourceLabel"
        :source-badge-fn="store.sourceBadge"
        @update:sort="applyTopicSort"
        @update:min_importance="applyTopicFilters('min_importance', $event)"
        @update:author_verified="applyTopicFilters('author_verified', $event)"
        @update:has_image="applyTopicFilters('has_image', $event)"
        @update:has_video="applyTopicFilters('has_video', $event)"
        @update:has_link="applyTopicFilters('has_link', $event)"
        @update:source="applyTopicFilters('source', $event)" />

      <div v-if="loading" class="loading-skeleton">
        <div v-for="n in 5" :key="n" class="skeleton-card">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-meta"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text w-60"></div>
        </div>
      </div>

      <div v-else-if="topics.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
        <p>{{ topicScope ? `"${topicScope}" 范围内暂无热点` : '暂无热点数据' }}</p>
        <p style="font-size: 0.72rem">{{ topicScope ? '尝试更换范围或等待系统自动采集' : '输入范围搜索或等待系统自动采集' }}</p>
      </div>

      <div v-for="topic in topics" :key="topic.id" class="topic-card" :class="{ 'topic-card--has-image': topic.image_url }">
        <div v-if="topic.image_url" class="topic-card__media" @click="store.previewImage(topic.image_url, topic.title)">
          <img :src="topic.image_url" :alt="topic.title" class="topic-card__image" loading="lazy" @error="onImageError" />
          <div class="topic-card__media-overlay">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </div>
        </div>

        <div class="topic-card__body">
          <div class="topic-card-header">
            <div class="topic-title-row">
              <a v-if="topic.source_url" :href="topic.source_url" target="_blank" class="topic-title-link" :title="topic.title">
                <span v-html="topic.title"></span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="topic-title-ext">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
              <span v-else class="topic-title-static">{{ topic.title }}</span>
            </div>

            <div class="topic-title-row" style="margin-bottom: 0">
              <span :class="['badge', store.sourceBadge(topic.source)]">{{ store.sourceLabel(topic.source) }}</span>
              <span v-if="topic.author_verified" class="badge badge-cyan">✅ 认证</span>
              <span v-if="topic.scope" class="badge badge-purple" style="font-size: 0.6rem" :title="topic.scope" v-for="item in topic.scope.split(',')" :key="item">
                {{ item }}
              </span>
              <span class="badge badge-red">{{ topic.keyword.word }}</span>
              <span v-if="store.extractDomain(topic.source_url)" class="badge badge-green" style="font-size: 0.6rem">{{ store.extractDomain(topic.source_url) }}</span>
            </div>

            <div class="topic-meta-row">
              <span v-if="store.getTopicAuthorName(topic)" class="topic-author">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {{ store.getTopicAuthorUserName(topic) || store.getTopicAuthorName(topic) }}
              </span>
              <span v-if="store.getTopicPublishTime(topic)" class="topic-time">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {{ store.formatFullTime(store.getTopicPublishTime(topic)) }}
              </span>
              <span v-else class="topic-time text-muted">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                未知时间
              </span>
              <span v-if="topic.capture_time" class="topic-time text-muted">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                {{ store.formatTime(topic.capture_time) }}
              </span>
            </div>
          </div>

          <div v-if="store.getContentPreview(topic.content)" class="topic-content-preview" v-html="store.getContentPreview(topic.content)"></div>

          <div v-if="topic.summary" class="topic-summary">
            <div style="font-size: 0.64rem; color: var(--text-muted); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 1px">AI 摘要</div>
            <span v-html="topic.summary"></span>
          </div>

          <div class="topic-metrics-row">
            <span v-if="topic.ai_analysis && topic.ai_analysis.credibilityPercentage != null" class="topic-credibility">
              <progress id="progressBar" :value="topic.ai_analysis.credibilityPercentage" max="100"></progress>
              <span class="topic-credibility-text">可信度 {{ topic.ai_analysis.credibilityPercentage }}%</span>
            </span>
            <span class="topic-importance-row">
              <span class="importance-bar" :title="'重要性: ' + topic.importance + '/10'">
                <span v-for="i in 10" :key="i" class="seg" :class="{ active: i <= topic.importance, high: i > 7 }"></span>
              </span>
              <span class="topic-importance-text">{{ topic.importance }}/10</span>
            </span>
          </div>

          <div class="topic-stats-row">
            <span v-if="topic.trendDirection" :class="['trend-badge', 'trend-' + topic.trendDirection]" :title="'热度趋势: ' + (topic.trendPercent > 0 ? '+' : '') + topic.trendPercent + '%'">
              {{ topic.trendDirection === 'rising' ? '🔥' : topic.trendDirection === 'falling' ? '❄️' : '➡️' }}
              {{ topic.trendDirection === 'rising' ? '上升' : topic.trendDirection === 'falling' ? '下降' : '平稳' }}
            </span>
            <span v-if="topic.likes > 0" class="topic-stat">
              <HeartOutlined />
              {{ store.formatCount(topic.likes) }}</span
            >
            <span v-if="topic.comments > 0" class="topic-stat">
              <MessageOutlined />
              {{ store.formatCount(topic.comments) }}</span
            >
            <span v-if="topic.views > 0" class="topic-stat">
              <EyeOutlined />
              {{ store.formatCount(topic.views) }}</span
            >
            <span v-if="topic.retweet_count > 0" class="topic-stat">
              <CalendarOutlined />
              {{ store.formatCount(topic.retweet_count) }}</span
            >
            <span v-if="topic.quote_count > 0" class="topic-stat">
              <RetweetOutlined />
              {{ store.formatCount(topic.quote_count) }}</span
            >
            <span v-if="topic.bookmark_count > 0" class="topic-stat">
              <TagsOutlined />
              {{ store.formatCount(topic.bookmark_count) }}</span
            >
          </div>

          <div class="topic-card-actions">
            <button v-if="topic.content || topic.ai_analysis || (topic.raw_data && topic.raw_data.author) || topic.author_name || topic.tweet_id" class="btn btn-sm btn-primary" @click="store.openDetail(topic)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="action-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              查看详情
            </button>
            <span style="flex: 1"></span>
            <a v-if="topic.video_url" :href="topic.video_url" target="_blank" class="btn btn-primary btn-sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="action-icon">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              播放视频
            </a>
            <a v-if="topic.source_url" :href="topic.source_url" target="_blank" class="btn btn-sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="action-icon">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              查看原文
            </a>
          </div>
        </div>
      </div>

      <Pagination :current-page="topicPage" :total-items="topicTotal" :page-size="topicPageSize" @page-change="goToTopicPage" />
    </div>

    <div class="bento-card span-2">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          数据概览
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px">
        <div class="stat-card">
          <div class="stat-card-value">{{ topicTotal }}</div>
          <div class="stat-card-label">热点总数</div>
        </div>

        <div v-if="topicScope" class="stat-card" style="border-color: rgba(255, 215, 64, 0.25)">
          <div class="stat-card-value" style="color: var(--accent-amber); font-size: 1.3rem; text-shadow: 0 0 20px rgba(255, 215, 64, 0.2)">
            {{ topicScope }}
          </div>
          <div class="stat-card-label">当前范围</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-value" style="color: var(--accent-green)">{{ sourceCount }}</div>
          <div class="stat-card-label">活跃数据源</div>
        </div>

        <div class="data-list-item" style="padding: 10px 14px; margin-bottom: 0" v-for="src in displayedSources" :key="src.id">
          <div class="item-content">
            <div class="item-title" style="font-size: 0.78rem; margin-bottom: 0">{{ src.name }}</div>
          </div>
          <span :class="['badge', store.sourceBadge(src.id)]" style="font-size: 0.6rem">{{ src.label }}</span>
        </div>
      </div>
    </div>
    <HsDialog v-model="store.detailModal.visible" :width="780" :draggable="true" :destroy-on-close="true" @opened="onDetailOpened">
      <template #header>
        <div class="dialog-header">
          <span class="dialog-title">{{ store.detailModal.topic.title }}</span>
        </div>
      </template>
      <template #default>
        <div v-if="store.detailModal.topic" class="detail-header">
          <div class="detail-header-meta">
            <span :class="['badge', store.sourceBadge(store.detailModal.topic.source)]"> {{ store.sourceLabel(store.detailModal.topic.source) }}</span>
            <span v-if="store.detailModal.topic.scope" class="badge badge-purple" style="font-size: 0.6rem" v-for="item in store.detailModal.topic.scope.split(',')" :key="item">
              {{ item }}
            </span>
            <span class="badge badge-red">{{ store.detailModal.topic.keyword.word }}</span>
            <span v-if="store.detailModal.topic.ai_analysis && store.detailModal.topic.ai_analysis.credibilityPercentage != null" class="detail-credibility">
              <progress id="progressBar" :value="store.detailModal.topic.ai_analysis.credibilityPercentage" max="100"></progress>
              <span style="font-size: 0.68rem; color: var(--text-primary); white-space: nowrap">可信度 {{ store.detailModal.topic.ai_analysis.credibilityPercentage }}%</span>
            </span>
            <span class="detail-importance">
              <span v-for="i in 10" :key="i" class="seg" :class="{ active: i <= store.detailModal.topic.importance, high: i > 7 }"></span>
              <span style="margin-left: 6px; font-size: 0.72rem">重要性 {{ store.detailModal.topic.importance }}/10</span>
            </span>
          </div>
          <div class="detail-meta-row">
            <span v-if="store.detailModal.topic.likes > 0">
              <HeartOutlined />
              {{ store.formatCount(store.detailModal.topic.likes) }}
            </span>
            <span v-if="store.detailModal.topic.comments > 0">
              <MessageOutlined />
              {{ store.formatCount(store.detailModal.topic.comments) }}
            </span>
            <span v-if="store.detailModal.topic.views > 0">
              <EyeOutlined />
              {{ store.formatCount(store.detailModal.topic.views) }}</span
            >
            <span v-if="store.getTopicPublishTime(store.detailModal.topic)" class="text-muted">
              <CalendarOutlined />
              发布: {{ store.formatFullTime(store.getTopicPublishTime(store.detailModal.topic)) }}</span
            >
            <span v-if="store.detailModal.topic.capture_time" class="text-muted">
              <CloudDownloadOutlined />
              抓取: {{ store.formatTime(store.detailModal.topic.capture_time) }}</span
            >
            <span class="text-muted">{{ store.formatTime(store.detailModal.topic.created_at) }}</span>
          </div>
        </div>
        <img v-if="store.detailModal.topic.image_url" :src="store.detailModal.topic.image_url" style="max-height: 200px; width: 100%; object-fit: cover; border-radius: 8px; margin-bottom: 12px" @error="onImageError" alt="" />

        <div v-if="store.detailModal.topic.summary" class="detail-section">
          <div class="detail-section-title">📝 AI 摘要</div>
          <div class="detail-summary-text" v-html="store.detailModal.topic.summary"></div>
        </div>

        <div v-if="store.detailModal.topic.content" class="detail-section">
          <div class="detail-section-title">📄 全文内容</div>
          <div class="detail-content-text" v-html="store.detailModal.topic.content"></div>
        </div>

        <div class="aspect-ratio" v-if="store.detailModal.topic.video_url">
          <iframe :src="store.detailModal.topic.video_url + '&high_quality=1'" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>
        </div>

        <div v-if="store.detailModal.topic.ai_analysis" class="detail-section">
          <div class="detail-section-title">🤖 AI 分析</div>
          <div class="detail-info-grid">
            <div class="detail-info-item">
              <span class="detail-info-label">相关性</span>
              <span class="detail-info-value">
                <span v-if="store.detailModal.topic.ai_analysis.isRelevant" class="badge badge-green">相关</span>
                <span v-else class="badge badge-red">不相关</span>
              </span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">可信度</span>
              <span class="detail-info-value">
                <span :class="['badge', store.credibilityBadge(store.detailModal.topic.ai_analysis.credibilityPercentage)]"> {{ store.detailModal.topic.ai_analysis.credibilityPercentage }}% </span>
                <span class="text-muted" style="margin-left: 6px; font-size: 0.7rem">{{ store.detailModal.topic.ai_analysis.credibilityText }}</span>
              </span>
            </div>
            <div v-if="store.detailModal.topic.ai_analysis.importance" class="detail-info-item">
              <span class="detail-info-label">重要性</span>
              <span class="detail-info-value">{{ store.detailModal.topic.ai_analysis.importance }}/10</span>
            </div>
            <div v-if="store.detailModal.topic.ai_analysis.scopeTags && store.detailModal.topic.ai_analysis.scopeTags.length > 0" class="detail-info-item">
              <span class="detail-info-label">领域标签</span>
              <span class="detail-info-value" style="display: flex; flex-wrap: wrap; gap: 4px">
                <span v-for="tag in store.detailModal.topic.ai_analysis.scopeTags" :key="tag" class="badge badge-cyan" style="font-size: 0.62rem">{{ tag }}</span>
              </span>
            </div>
            <div v-if="store.detailModal.topic.ai_analysis.reason" class="detail-info-item detail-info-full">
              <span class="detail-info-label">分析理由</span>
              <span class="detail-info-value" style="font-size: 0.78rem">{{ store.detailModal.topic.ai_analysis.reason }}</span>
            </div>
            <div v-if="store.detailModal.topic.ai_analysis.shortTitle" class="detail-info-item detail-info-full">
              <span class="detail-info-label">AI 生成标题</span>
              <span class="detail-info-value mono" v-html="store.detailModal.topic.ai_analysis.shortTitle"></span>
            </div>
          </div>
        </div>

        <div v-if="store.detailModal.topic.snapshots && store.detailModal.topic.snapshots.length >= 1" class="detail-section">
          <div class="detail-section-title">📈 热度趋势追踪</div>
          <div ref="trendChartRef" style="width: 100%; height: 220px"></div>
        </div>

        <details v-if="store.detailModal.topic.ai_analysis" class="detail-collapse">
          <summary class="detail-collapse-summary">📋 原始 AI 数据</summary>
          <pre class="detail-json">{{ store.formatJson(store.detailModal.topic.ai_analysis) }}</pre>
        </details>

        <div v-if="store.detailModal.topic.source !== 'twitter' && store.detailModal.topic.raw_data && store.hasRawAuthor(store.detailModal.topic.raw_data)" class="detail-section">
          <div class="detail-section-title">👤 作者信息</div>
          <div class="detail-info-grid">
            <div v-if="store.detailModal.topic.raw_data.author" class="detail-info-item">
              <span class="detail-info-label">作者</span>
              <span class="detail-info-value">{{ store.detailModal.topic.raw_data.author }}</span>
            </div>
            <div v-if="store.detailModal.topic.raw_data.pub_date" class="detail-info-item">
              <span class="detail-info-label">发布时间</span>
              <span class="detail-info-value">{{ store.detailModal.topic.raw_data.pub_date }}</span>
            </div>
            <div v-if="store.detailModal.topic.raw_data.feed_source" class="detail-info-item">
              <span class="detail-info-label">Feed 来源</span>
              <a :href="store.detailModal.topic.raw_data.feed_source" target="_blank" class="detail-info-value link-cyan">{{ store.detailModal.topic.raw_data.feed_source }}</a>
            </div>
            <div v-if="store.detailModal.topic.raw_data.description" class="detail-info-item detail-info-full">
              <span class="detail-info-label">描述</span>
              <span class="detail-info-value detail-info-desc" v-html="store.detailModal.topic.raw_data.description"></span>
            </div>
          </div>
        </div>

        <div v-if="store.detailModal.topic.source === 'twitter' && (store.detailModal.topic.author_name || store.detailModal.topic.author_user_name)" class="detail-section">
          <div class="detail-section-title">👤 作者信息 (Twitter)</div>
          <div class="tw-author-card">
            <img v-if="store.detailModal.topic.author_cover_picture" :src="store.detailModal.topic.author_cover_picture" class="tw-author-cover" @error="onImageError" alt="" />
            <div class="tw-author-card-inner">
              <img v-if="store.detailModal.topic.author_profile_picture" :src="store.detailModal.topic.author_profile_picture" class="tw-author-avatar" @error="onAvatarError" />
              <div class="tw-author-details">
                <div class="tw-author-names">
                  <strong>{{ store.detailModal.topic.author_name || '' }}</strong>
                  <span v-if="store.detailModal.topic.author_user_name" class="text-muted">@{{ store.detailModal.topic.author_user_name }}</span>
                  <span v-if="store.detailModal.topic.author_verified" class="badge badge-cyan" style="font-size: 0.6rem">已认证</span>
                  <span v-if="store.detailModal.topic.author_verified_type" class="badge badge-purple" style="font-size: 0.6rem">{{ store.detailModal.topic.author_verified_type }}</span>
                </div>
                <div v-if="store.detailModal.topic.author_description" class="tw-author-bio">
                  {{ store.detailModal.topic.author_description }}
                </div>
                <div class="tw-author-stats">
                  <span v-if="store.detailModal.topic.author_followers > 0">粉丝: {{ store.formatCount(store.detailModal.topic.author_followers) }}</span>
                  <span v-if="store.detailModal.topic.author_following > 0">关注: {{ store.formatCount(store.detailModal.topic.author_following) }}</span>
                  <span v-if="store.detailModal.topic.author_statuses_count > 0">推文: {{ store.formatCount(store.detailModal.topic.author_statuses_count) }}</span>
                  <span v-if="store.detailModal.topic.author_favourites_count > 0">喜欢: {{ store.formatCount(store.detailModal.topic.author_favourites_count) }}</span>
                  <span v-if="store.detailModal.topic.author_media_count > 0">媒体: {{ store.formatCount(store.detailModal.topic.author_media_count) }}</span>
                  <span v-if="store.detailModal.topic.author_location">{{ store.detailModal.topic.author_location }}</span>
                </div>
                <div v-if="store.detailModal.topic.author_created_at" class="tw-author-joined text-muted">
                  加入时间:
                  {{ store.formatTime(store.detailModal.topic.author_created_at) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="store.detailModal.topic.source === 'twitter' && store.detailModal.topic.tweet_id" class="detail-section">
          <div class="detail-section-title">🐦 推文详情</div>
          <div class="detail-info-grid">
            <div class="detail-info-item">
              <span class="detail-info-label">推文 ID</span>
              <span class="detail-info-value mono">{{ store.detailModal.topic.tweet_id }}</span>
            </div>
            <div v-if="store.detailModal.topic.tweet_created_at" class="detail-info-item">
              <span class="detail-info-label">发布时间</span>
              <span class="detail-info-value">{{ store.formatTime(store.detailModal.topic.tweet_created_at) }}</span>
            </div>
            <div v-if="store.detailModal.topic.tweet_lang" class="detail-info-item">
              <span class="detail-info-label">语言</span>
              <span class="detail-info-value">{{ store.detailModal.topic.tweet_lang }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">互动数据</span>
              <span class="detail-info-value"> <RetweetOutlined /> {{ store.detailModal.topic.retweet_count || 0 }} 转发 &nbsp; <MessageOutlined /> {{ store.detailModal.topic.quote_count || 0 }} 引用 &nbsp; <TagsOutlined /> {{ store.detailModal.topic.bookmark_count || 0 }} 书签 </span>
            </div>
          </div>
        </div>
      </template>
    </HsDialog>
  </div>
</template>

<script>
import { CalendarOutlined, CloudDownloadOutlined, EyeOutlined, HeartOutlined, MessageOutlined, RetweetOutlined, TagsOutlined } from '@ant-design/icons-vue'
import * as echarts from 'echarts'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as XLSX from 'xlsx'
import { getHotTopics } from '../api'
import FilterBar from '../components/FilterBar.vue'
import HsDialog from '../components/HsDialog.vue'
import Pagination from '../components/Pagination.vue'
import { useAppStore } from '../composables/useAppStore.js'
import { sanitizeHtml } from '../utils'

const sortOpts = [
  { value: 'latest', label: '最新时间' },
  { value: 'importance', label: '重要性优先' },
  { value: 'heat', label: '互动热度' },
  { value: 'tweet_heat', label: '推文热度' },
  { value: 'smart', label: '智能综合' }
]

const importanceOpts = [
  { value: '', label: '不限' },
  { value: '1', label: '≥1' },
  { value: '3', label: '≥3' },
  { value: '5', label: '≥5' },
  { value: '7', label: '≥7' },
  { value: '9', label: '≥9' }
]

const mediaOpts = [
  { key: 'has_image', label: '含图片' },
  { key: 'has_video', label: '含视频' },
  { key: 'has_link', label: '含链接' }
]

export default {
  name: 'HotDiscovery',
  components: {
    HsDialog,
    Pagination,
    FilterBar,
    HeartOutlined,
    MessageOutlined,
    EyeOutlined,
    CalendarOutlined,
    CloudDownloadOutlined,
    TagsOutlined,
    RetweetOutlined
  },
  methods: { sanitizeHtml },
  setup() {
    const store = useAppStore()

    const topics = ref([])
    const topicPage = ref(1)
    const topicTotal = ref(0)
    const topicPageSize = ref(5)
    const topicScope = ref('')
    const searchKeyword = ref('')
    const loading = ref(false)
    const trendChartRef = ref()
    const dialogOpened = ref(false)
    let trendChartInstance = null

    watch(
      () => store.detailModal.visible,
      val => {
        if (!val) {
          dialogOpened.value = false
          if (trendChartInstance) {
            trendChartInstance.dispose()
            trendChartInstance = null
          }
        }
      }
    )

    watch(
      () => store.detailModal.topic?.snapshots,
      snapshots => {
        if (snapshots && snapshots.length >= 1 && dialogOpened.value) {
          nextTick(() => {
            tryRenderTrendChart(snapshots)
          })
        }
      }
    )

    function onDetailOpened() {
      dialogOpened.value = true
      const snapshots = store.detailModal.topic?.snapshots
      if (snapshots && snapshots.length >= 1) {
        nextTick(() => {
          tryRenderTrendChart(snapshots)
        })
      }
    }

    function tryRenderTrendChart(snapshots) {
      if (trendChartInstance) {
        trendChartInstance.dispose()
        trendChartInstance = null
      }
      if (!trendChartRef.value) {
        setTimeout(() => tryRenderTrendChart(snapshots), 50)
        return
      }
      const el = trendChartRef.value
      if (el.offsetWidth === 0 || el.offsetHeight === 0) {
        setTimeout(() => tryRenderTrendChart(snapshots), 50)
        return
      }
      trendChartInstance = echarts.init(el)
      const times = snapshots.map(s =>
        new Date(s.snapshot_time || s.time).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        })
      )
      const likesData = snapshots.map(s => s.likes || 0)
      const commentsData = snapshots.map(s => s.comments || 0)
      const viewsData = snapshots.map(s => s.views || 0)

      function fmtNum(n) {
        if (n >= 10000) return (n / 10000).toFixed(1) + '万'
        if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
        return String(n)
      }

      const leftMax = Math.max(...viewsData, 1)
      const rightMax = Math.max(...likesData, ...commentsData, 1)

      trendChartInstance.setOption({
        color: ['#ff6b6b', '#4ecdc4', '#ffe66d'],
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(15, 15, 25, 0.96)',
          borderColor: 'rgba(0, 229, 255, 0.25)',
          borderWidth: 1,
          textStyle: { color: '#ccc', fontSize: 12 },
          formatter: function (params) {
            let html = '<div style="font-weight:700;margin-bottom:6px;color:#fff">' + params[0].axisValue + '</div>'
            params.forEach(function (p) {
              html +=
                '<div style="display:flex;align-items:center;gap:8px;margin:3px 0">' +
                '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' +
                p.color +
                ';flex-shrink:0"></span>' +
                '<span style="color:#aaa;flex:1">' +
                p.seriesName +
                '</span>' +
                '<span style="color:#fff;font-weight:600;font-family:JetBrains Mono,monospace">' +
                fmtNum(p.value) +
                '</span>' +
                '</div>'
            })
            return html
          }
        },
        legend: {
          data: ['👍 点赞', '💬 评论', '👁 浏览'],
          top: 0,
          left: 'center',
          textStyle: { color: '#888', fontSize: 11 },
          itemWidth: 14,
          itemHeight: 2,
          itemGap: 20
        },
        grid: { left: 50, right: 50, top: 35, bottom: 35 },
        xAxis: {
          type: 'category',
          data: times,
          boundaryGap: false,
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisTick: { show: false },
          axisLabel: { color: '#666', fontSize: 10 }
        },
        yAxis: [
          {
            type: 'value',
            name: '浏览',
            nameTextStyle: { color: '#ffe66d', fontSize: 10 },
            position: 'left',
            max: function (v) {
              return v.max * 1.15
            },
            axisLabel: { color: '#888', fontSize: 10, formatter: fmtNum },
            splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.04)', type: 'dashed' } }
          },
          {
            type: 'value',
            name: '赞 / 评',
            nameTextStyle: { color: '#ccc', fontSize: 10 },
            position: 'right',
            max: function (v) {
              return v.max * 1.2
            },
            axisLabel: { color: '#888', fontSize: 10, formatter: fmtNum },
            splitLine: { show: false }
          }
        ],
        series: [
          {
            name: '👁 浏览',
            type: 'line',
            yAxisIndex: 0,
            smooth: 0.35,
            data: viewsData,
            symbol: 'circle',
            symbolSize: 6,
            showSymbol: snapshots.length <= 8,
            lineStyle: { color: '#ffe66d', width: 2.5, cap: 'round' },
            itemStyle: { color: '#ffe66d', borderColor: '#0a0a0f', borderWidth: 1.5 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(255,230,109,0.18)' },
                { offset: 1, color: 'rgba(255,230,109,0.0)' }
              ])
            },
            emphasis: {
              focus: 'series',
              itemStyle: { borderWidth: 2.5 }
            }
          },
          {
            name: '👍 点赞',
            type: 'line',
            yAxisIndex: 1,
            smooth: 0.35,
            data: likesData,
            symbol: 'roundRect',
            symbolSize: 7,
            showSymbol: snapshots.length <= 8,
            lineStyle: { color: '#ff6b6b', width: 2.5, cap: 'round' },
            itemStyle: { color: '#ff6b6b', borderColor: '#0a0a0f', borderWidth: 1.5 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(255,107,107,0.14)' },
                { offset: 1, color: 'rgba(255,107,107,0.0)' }
              ])
            }
          },
          {
            name: '💬 评论',
            type: 'line',
            yAxisIndex: 1,
            smooth: 0.35,
            data: commentsData,
            symbol: 'diamond',
            symbolSize: 7,
            showSymbol: snapshots.length <= 8,
            lineStyle: { color: '#4ecdc4', width: 2.5, cap: 'round', type: 'solid' },
            itemStyle: { color: '#4ecdc4', borderColor: '#0a0a0f', borderWidth: 1.5 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(78,205,196,0.14)' },
                { offset: 1, color: 'rgba(78,205,196,0.0)' }
              ])
            }
          }
        ]
      })

      trendChartInstance.resize()
    }

    function handleWindowResize() {
      if (trendChartInstance && !trendChartInstance.isDisposed()) {
        trendChartInstance.resize()
      }
    }

    const topicSort = ref('latest')
    const topicFilters = ref({
      source: [],
      min_importance: '',
      author_verified: false,
      has_image: false,
      has_video: false,
      has_link: false
    })

    const sourceCount = computed(() => {
      const sources = new Set(topics.value.map(t => t.source).filter(Boolean))
      return sources.size
    })

    const displayedSources = computed(() => {
      return store.sources.slice(0, 8)
    })

    let refreshTimer = null

    async function loadTopics(params = {}) {
      try {
        loading.value = true
        const page = params.page !== undefined ? params.page : topicPage.value
        const limit = params.limit !== undefined ? params.limit : topicPageSize.value
        const scope = params.scope !== undefined ? params.scope : topicScope.value
        const sort = params.sort !== undefined ? params.sort : topicSort.value
        const filters = params.filters !== undefined ? params.filters : topicFilters.value
        const keyword = params.keyword !== undefined ? params.keyword : searchKeyword.value

        const query = { page, limit, sort }
        if (scope) query.scope = scope
        if (keyword) query.keyword = keyword
        if (filters.source.length > 0) query.source = filters.source.join(',')
        if (filters.min_importance) query.min_importance = filters.min_importance
        if (filters.author_verified) query.author_verified = 'true'
        if (filters.has_image) query.has_image = 'true'
        if (filters.has_video) query.has_video = 'true'
        if (filters.has_link) query.has_link = 'true'

        const res = await getHotTopics(query)
        topics.value = res.data.data || []
        topicTotal.value = res.data.total || 0
        topicPage.value = res.data.page || page
      } catch (e) {
        /* ignore */
      } finally {
        loading.value = false
      }
    }

    async function goToTopicPage(page) {
      topicPage.value = page
      window.scrollTo(0, 0)
      await loadTopics({ page })
    }

    async function searchTopics(scope) {
      topicScope.value = scope
      topicPage.value = 1
      await loadTopics({ page: 1, scope })
    }

    async function searchByKeyword(keyword) {
      searchKeyword.value = keyword
      topicScope.value = ''
      topicPage.value = 1
      await loadTopics({ page: 1, keyword, scope: '' })
    }

    function applyTopicSort(val) {
      topicSort.value = val
      topicPage.value = 1
      loadTopics({ page: 1, sort: val })
    }

    function applyTopicFilters(key, val) {
      topicFilters.value[key] = val
      topicPage.value = 1
      loadTopics({ page: 1 })
    }

    function resetTopicFilters() {
      topicFilters.value = {
        source: [],
        min_importance: '',
        author_verified: false,
        has_image: false,
        has_video: false,
        has_link: false
      }
      topicSort.value = 'latest'
      topicScope.value = ''
      searchKeyword.value = ''
      topicPage.value = 1
      loadTopics({ page: 1 })
    }

    async function doExport(format) {
      try {
        store.showToast('正在生成导出文件...')
        const params = { limit: 10000 }
        if (topicFilters.value.source.length > 0) params.source = topicFilters.value.source.join(',')
        if (topicFilters.value.min_importance) params.min_importance = topicFilters.value.min_importance
        if (topicScope.value) params.scope = topicScope.value
        if (searchKeyword.value) params.keyword = searchKeyword.value
        if (topicSort.value) params.sort = topicSort.value
        const res = await getHotTopics(params)
        const rows = (res.data.data || []).map(t => ({
          ID: t.id,
          标题: t.title,
          摘要: t.summary || '',
          内容预览: t.content ? t.content.substring(0, 200) : '',
          关键词: t.keyword ? t.keyword.word : '',
          范围: t.scope || '',
          来源: t.source,
          原文链接: t.source_url || '',
          重要性: t.importance,
          点赞数: t.likes || 0,
          评论数: t.comments || 0,
          浏览数: t.views || 0,
          转发数: t.retweet_count || 0,
          书签数: t.bookmark_count || 0,
          可信度: t.ai_analysis ? (t.ai_analysis.credibilityPercentage ?? '') : '',
          发布时间: t.publish_time ? new Date(t.publish_time).toLocaleString('zh-CN') : '',
          创建时间: t.created_at ? new Date(t.created_at).toLocaleString('zh-CN') : ''
        }))

        if (format === 'csv') {
          const headers = Object.keys(rows[0] || {})
          const csv =
            '\uFEFF' +
            headers.join(',') +
            '\n' +
            rows
              .map(r =>
                headers
                  .map(h => {
                    const v = String(r[h] ?? '')
                    return v.includes(',') || v.includes('"') || v.includes('\n') ? '"' + v.replace(/"/g, '""') + '"' : v
                  })
                  .join(',')
              )
              .join('\n')
          const blob = new Blob([csv], { type: 'text/csv; charset=utf-8' })
          downloadBlob(blob, `热点数据_${new Date().toISOString().slice(0, 10)}.csv`)
        } else {
          const ws = XLSX.utils.json_to_sheet(rows)
          const wb = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb, ws, '热点数据')
          const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
          const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
          downloadBlob(blob, `热点数据_${new Date().toISOString().slice(0, 10)}.xlsx`)
        }
        store.showToast(`已导出 ${format.toUpperCase()} 文件 (${rows.length} 条)`)
      } catch (e) {
        store.showToast('导出失败，请重试')
      }
    }

    function downloadBlob(blob, filename) {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    }

    const IMG_PLACEHOLDER =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">' +
          '<rect fill="#1a1a2e" width="400" height="300" rx="8"/>' +
          '<g transform="translate(175,100)" stroke="#4a4a6a" stroke-width="2" fill="none">' +
          '<rect x="2" y="2" width="46" height="46" rx="6"/>' +
          '<circle cx="14" cy="14" r="5" fill="#4a4a6a"/>' +
          '<polyline points="48 48 36 32 2 48"/>' +
          '</g>' +
          '<text fill="#4a4a6a" font-size="13" font-family="system-ui,sans-serif" text-anchor="middle">' +
          '<tspan x="200" y="182">图片加载失败</tspan>' +
          '</text>' +
          '</svg>'
      )

    const AVATAR_PLACEHOLDER =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
          '<circle fill="#1a1a2e" cx="50" cy="50" r="50"/>' +
          '<circle fill="none" stroke="#4a4a6a" stroke-width="2" cx="50" cy="50" r="24"/>' +
          '<path fill="#4a4a6a" d="M50 28a12 12 0 100 24 12 12 0 000-24zM28 62c0-10 10-18 22-18s22 8 22 18"/>' +
          '</svg>'
      )

    function onImageError(e) {
      if (e.target.src === IMG_PLACEHOLDER) return
      e.target.src = IMG_PLACEHOLDER
      e.target.style.opacity = '0.5'
      e.target.style.filter = 'grayscale(0.6)'
    }

    function onAvatarError(e) {
      if (e.target.src === AVATAR_PLACEHOLDER) return
      e.target.src = AVATAR_PLACEHOLDER
      e.target.style.opacity = '0.6'
    }

    onMounted(() => {
      loadTopics()
      refreshTimer = setInterval(loadTopics, 30000)
      window.addEventListener('resize', handleWindowResize)
    })

    onUnmounted(() => {
      if (refreshTimer) clearInterval(refreshTimer)
      window.removeEventListener('resize', handleWindowResize)
      if (trendChartInstance) {
        trendChartInstance.dispose()
        trendChartInstance = null
      }
    })

    return {
      store,
      topics,
      topicPage,
      topicTotal,
      topicPageSize,
      topicScope,
      searchKeyword,
      topicSort,
      topicFilters,
      sortOpts,
      importanceOpts,
      mediaOpts,
      loading,
      sourceCount,
      displayedSources,
      loadTopics,
      goToTopicPage,
      searchTopics,
      searchByKeyword,
      applyTopicSort,
      applyTopicFilters,
      resetTopicFilters,
      doExport,
      trendChartRef,
      onDetailOpened,
      onImageError,
      onAvatarError
    }
  }
}
</script>

<style scoped>
.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.trend-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.trend-rising {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
  border: 1px solid rgba(255, 107, 107, 0.3);
}

.trend-falling {
  background: rgba(78, 205, 196, 0.15);
  color: #4ecdc4;
  border: 1px solid rgba(78, 205, 196, 0.3);
}

.trend-stable {
  background: rgba(136, 136, 136, 0.15);
  color: #888;
  border: 1px solid rgba(136, 136, 136, 0.3);
}
</style>

# 热点哨兵 - 技术方案

## 技术选型

| 层级        | 技术                                    | 理由                        |
| ----------- | --------------------------------------- | --------------------------- |
| 前端框架    | Vue 3 + Vite                            | 轻量敏捷，响应式开箱即用    |
| 前端语言    | **JavaScript**（不使用 TypeScript）     | 敏捷开发，减少编译负担      |
| CSS         | **原生 CSS**（无预处理器）              | 保持简洁                    |
| UI 图标     | @ant-design/icons-vue（部分）+ SVG 内联 | 图标丰富 + 零额外请求       |
| HTTP 库     | **axios**                               | 前端后端统一使用            |
| 图表        | **ECharts**（vue-echarts）              | 仪表盘数据可视化            |
| 实时通信    | **Socket.IO**（WebSocket）              | 通知实时推送 + 设置广播同步 |
| Excel 导出  | **xlsx**（SheetJS）                     | 前端直接导出，无需后端      |
| 路由        | **vue-router** (Vue Router 4)           | SPA 页面导航                |
| 状态管理    | **Composables**（Vue 3 组合式 API）     | 轻量级响应式状态共享        |
| 后端        | Node.js + Express                       | 需要后台定时任务 + 调用 AI  |
| 数据存储    | **Sequelize + MySQL**                   | ORM 管理，方便查询和配置    |
| AI 服务     | DeepSeek / 讯飞 Spark / 通义千问 / Ollama | 多后端支持，自动降级    |
| 网页搜索    | 爬虫                                    | 16 源并行采集               |
| X (Twitter) | twitterapi.io                           | 全球热点推文搜索            |
| 邮件发送    | nodemailer + QQ SMTP                    | 可靠的通知渠道，精美 HTML 模板 |
| 定时任务    | node-cron                              | 轻量级定时调度，按频率分组  |

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                   前端页面 (Vue 3 + Vite)                     │
│  ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌───────────┐  │
│  │  仪表盘    │ │ 关键词监控  │ │  热点发现   │ │  全网搜索   │  │
│  │ (ECharts) │ │ - 增删改查 │ │ - 多维排序  │ │ - 多源并行 │  │
│  │ - 趋势图   │ │ - 开关控制 │ │ - 高级过滤  │ │ - AI 分析  │  │
│  │ - 饼图    │ │ - 频率设置 │ │ - 趋势展示  │ │ - 搜索建议 │  │
│  │ - 雷达图   │ │ - 导出报告 │ │ - 媒体预览  │ │ - 数据源选 │  │
│  └───────────┘ └───────────┘ └────────────┘ └───────────┘  │
│  ┌──────────────────────┐ ┌──────────────────────────────┐  │
│  │     通知中心          │ │        系统设置               │  │
│  │ - 实时 WebSocket 推送 │ │ - 通知/邮件/采集/AI 配置     │  │
│  │ - 多维排序过滤        │ │ - 数据源独立开关             │  │
│  │ - 导出 Excel         │ │ - 本地 Ollama AI 状态        │  │
│  └──────────────────────┘ └──────────────────────────────┘  │
│  公共组件: HsDialog(模态框) | FilterBar(过滤器) | Pagination │
│  状态管理: useAppStore (Toast/通知轮询/Socket/全局状态)      │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API + WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                后端服务 (Express + Socket.IO)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────────┐ │
│  │ 关键词CRUD│ │ 热点CRUD  │ │     仪表盘统计 API            │ │
│  │          │ │ + 趋势API │ │  (多维度聚合查询)              │ │
│  └──────────┘ └──────────┘ └──────────────────────────────┘ │
│  ┌────────────────┐ ┌────────────────────────────────────┐  │
│  │  全网搜索 API   │ │         设置管理 API               │  │
│  │ (实时采集+AI)   │ │  (WebSocket 广播 + 缓存失效)       │  │
│  └────────────────┘ └────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   定时调度器 (scheduler.js)              │  │
│  │  node-cron → 按频率分组 → 遍历活跃关键词 → 并行采集     │  │
│  │  → AI 分析 → 存入热点/通知 → WebSocket 推送 → 邮件      │  │
│  │  → 创建快照 (topic_snapshots) 用于趋势追踪              │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ 爬虫模块  │ │ X 搜索   │ │ AI 分析   │ │  邮件发送     │   │
│  │ (16源)   │ │(twitterapi)│ │(多后端)  │ │ (nodemailer) │   │
│  │ ─────────│ │          │ │ ─────────│ │ ─────────────│   │
│  │ twitter  │ │          │ │ DeepSeek │ │ HTML 模板     │   │
│  │ bing     │ │          │ │ Spark-x  │ │ 批量发送      │   │
│  │ so360    │ │          │ │ Qwen     │ │              │   │
│  │ bilibili │ │          │ │ Ollama   │ │              │   │
│  │ baidu    │ │          │ │          │ │              │   │
│  │ weibo    │ │          │ │          │ │              │   │
│  │ sogou    │ │          │ │          │ │              │   │
│  │ zhihu    │ │          │ │          │ │              │   │
│  │ juejin   │ │          │ │          │ │              │   │
│  │ csdn     │ │          │ │          │ │              │   │
│  │ oschina  │ │          │ │          │ │              │   │
│  │ rss/tencent│          │ │          │ │              │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         设置缓存 (settingsCache.js)                   │    │
│  │ 内存缓存 + 5min TTL → WebSocket 广播更新 → 通知推送   │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │           数据层 (Sequelize + MySQL)                  │    │
│  │  keywords / hot_topics / notifications / settings /   │    │
│  │  topic_snapshots (5 张表)                             │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## 前端路由设计

| 路由             | 页面           | 说明                             |
| ---------------- | -------------- | -------------------------------- |
| `/dashboard`     | Dashboard      | 数据大屏，ECharts 可视化         |
| `/monitor`       | KeywordMonitor | 关键词增删改查、频率控制、导出   |
| `/discovery`     | HotDiscovery   | 热点列表、排序过滤、趋势展示     |
| `/search`        | SearchView     | 全网实时搜索，AI 智能分析        |
| `/notifications` | NotificationCenter | 通知列表、已读管理、导出      |
| `/settings`      | SettingsPanel  | 系统设置、数据源开关、AI 配置    |
| `/` 及无效路由   | 重定向         | `/ → /dashboard`，其余 → `/monitor` |

## 核心 API 对接

### DeepSeek API

```
POST https://api.deepseek.com/chat/completions
Header: Authorization: Bearer 
Body: {
  "model": "deepseek-v4-flash",
  "messages": [...],
  "response_format": { "type": "json_object" },
  "stream": false
}
```

- 模型：`deepseek-v4-flash`（轻量快速，适合内容分析）
- 使用 `json_object` 格式确保 AI 返回结构化数据
- 不用流式输出（分析场景不需要）

### 讯飞 Spark API

```
POST https://spark-api-open.xf-yun.com/v2/chat/completions
Authorization: Bearer {API_KEY}:{API_SECRET}
Model: spark-x
```

- 使用 OpenAI SDK 兼容模式调用
- 不走 `json_object` 格式，响应需手动清理 markdown 代码块后解析 JSON

### 通义千问 API

```
POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
Authorization: Bearer s
Model: qwen3.6-flash
```

- 使用 OpenAI SDK 兼容模式调用
- 不走 `json_object` 格式，响应需手动清理 markdown 代码块后解析 JSON

### Ollama 本地 API

```
POST http://localhost:11434/api/chat
Body: {
  "model": "gemma3:4b",
  "messages": [...],
  "stream": false,
  "options": { "temperature": 0.3, "num_predict": 4096 }
}
```

- 本地模型：`gemma3:4b`（快速）/ `qwen3.5:4b`（深度推理）
- 通过 `.env` 文件 `USE_LOCAL_AI=true` 启用
- 不可用时自动降级到云端 API

### TwitterAPI.io

```
GET https://api.twitterapi.io/twitter/tweet/advanced_search
    ?queryType=Latest&query={keyword}
Header: X-API-Key: 
```

- 查询类型：`Latest`（最新推文）
- 支持 cursor 分页获取更多结果
- 每个关键词最多获取 40 条（2 次请求 × 20 条）
- 搜索语法支持：`keyword1 OR keyword2`、`from:user`、`since_time:timestamp`
- 返回丰富的推文元数据：作者信息、互动数据、媒体资源等

### QQ 邮箱 SMTP

```
Host: smtp.qq.com
Port: 465 (SSL)
User: 2381345593@qq.com
Pass: bytruzmkfmdiecfd
```

## 爬虫策略

### 并行采集架构

- 最大并发数：4（通过 `Promise.race` 控制并发）
- 每个数据源独立执行，互不阻塞
- 手动搜索模式（`searchKeywordSources`）支持指定数据源列表
- 定时任务模式读取 `settings` 表中 `crawl_source_{name}` 开关控制

### 频率控制

- 每个数据源爬取间隔至少 30 秒（热搜榜单源）
- 搜索类数据源无额外间隔（并发控制已保障）
- 每个数据源每次只拉 1-2 页结果
- 使用随机 User-Agent（3 个预设 UA 轮换）
- 请求超时 15 秒，支持 2 次重试

### 爬虫源详情

#### 搜索类（按关键词搜索，用于定时监控 + 手动搜索）

| 源              | URL                                                                                     | 解析方式            | 返回条数 |
| --------------- | --------------------------------------------------------------------------------------- | ------------------- | -------- |
| Twitter (X)     | `https://api.twitterapi.io/twitter/tweet/advanced_search`                               | JSON API            | ≤40      |
| Bing 搜索       | `https://www.bing.com/search?q={keyword}`                                               | HTML 解析           | ≤3       |
| 360 搜索        | `https://www.so.com/s?q={keyword}`                                                      | HTML 解析           | ≤3       |
| B站 搜索        | `https://api.bilibili.com/x/web-interface/wbi/search/all/v2?keyword={keyword}`          | JSON API            | ≤5       |
| 百度搜索        | `https://www.baidu.com/s?wd={keyword}&rn=15`                                            | HTML 解析           | ≤3       |
| 微博搜索        | `https://s.weibo.com/weibo?q={keyword}` (Cookie 认证)                                   | HTML 解析           | ≤3       |
| 搜狗搜索        | `https://www.sogou.com/web?query={keyword}`                                             | HTML 解析 + 重定向  | ≤3       |
| 知乎热搜        | `https://api.zhihu.com/topstory/hot-lists/total?limit=50` + 关键词匹配                   | JSON API            | ≤5       |
| 掘金搜索        | `https://api.juejin.cn/search_api/v1/search`                                            | JSON API            | ≤5       |
| CSDN 搜索       | `https://so.csdn.net/api/v3/search`（过滤 VIP 付费内容）                                 | JSON API            | ≤5       |
| 开源中国        | `https://www.oschina.net/news` + 关键词匹配 + 详情页提取                                  | HTML 解析           | ≤5       |

#### 热搜榜单类（用于热点发现，非关键词搜索）

| 源        | URL                                                              | 解析方式            | 返回条数 |
| --------- | ---------------------------------------------------------------- | ------------------- | -------- |
| 百度热搜  | `https://top.baidu.com/board?tab=realtime`                       | HTML 解析           | ≤15      |
| 微博热搜  | `https://weibo.com/ajax/side/hotSearch`                          | JSON API            | ≤15      |
| B 站热搜  | `https://api.bilibili.com/x/web-interface/wbi/search/square`     | JSON API            | ≤15      |
| 腾讯新闻  | `https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=20`  | JSON API            | ≤10      |
| RSS       | 36氪 / 少数派 / 开源中国博客                                        | XML 解析            | ≤5/feed  |

### 内容过滤策略

- **B站搜索**：自动过滤付费/大会员内容
- **CSDN**：自动过滤 VIP 付费文章
- **搜狗搜索**：自动过滤视频/影视/综艺/娱乐类结果
- **360 搜索**：自动过滤百科内容
- **各搜索引擎**：过滤内容与标题相同的低质结果
- **搜狗重定向**：自动解析搜狗跳转链接获取真实 URL

## 核心流程

### 流程 A：关键词监控（定时调度）

```
node-cron 定时触发 → 按爬取频率分组（5min/15min/30min/...）
  → 每组的 cron 表达式独立运行
  → 遍历该频率下的活跃关键词
    → searchKeywordSources(keyword) 多源并行采集（不传 sources 参数，走设置表开关）
    → AI 审核（根据 settings.ai_review_enabled 决定是否启用）
      → 判断：是否真正相关？可信度？重要性？
      → 生成精炼标题 + 范围标签
    → 去重检查（title + keyword_id）
    → 判定为真的内容 → 存入 hot_topics
      → 创建 notification
      → WebSocket → 推送浏览器通知
      → 邮件批量发送（按关键词分组，HTML 模板）
    → 判定为假 → 丢弃
  → 全量快照：为已有关键词的所有热点创建 topic_snapshots
  → 更新 keyword.last_checked_at
```

### 流程 B：全网搜索（手动触发）

```
用户输入关键词 → 选择数据源（可选） → 选择是否启用 AI 分析
  → searchKeywordSources(keyword, requestedSources) 多源并行采集
  → 结果去重（标题+URL指纹）
  → 结果过滤（关键词匹配度、内容质量）
  → AI 分析（keywordsAnalysis 提示词模板）
    → 每条结果：isRelevant / importance / credibility / shortTitle / scopeTags
  → 按 AI 相关性 + 重要性排序
  → 返回前端，展示 AI 分析报告
  → 附带搜索建议（热门关键词匹配 + 关联词拓展）
```

### 流程 C：热点发现（前端查询）

```
前端请求 → 数据库查询 hot_topics 表
  → 支持多维排序：
    - latest: 按 capture_time 降序
    - importance: 按 importance 降序
    - heat: 综合公式 (likes + comments*2 + views*0.1)
    - tweet_heat: Twitter 热度 (likes + retweet_count*2)
    - smart: 智能公式 (重要性*3 + 对数热度 + 时效性衰减)
  → 支持多条件过滤（关键词/范围/数据源/重要性/蓝V/媒体）
  → 关联查询 keyword 信息
  → 点击热点时查询 topic_snapshots 获取趋势数据
```

## 数据库配置

```
Host: 127.0.0.1
Port: 3306
User: root
Password: root
Database: hot_sentinel
```

## 数据模型 (Sequelize + MySQL)

### 数据库连接配置

```javascript
// server/config/database.js
const { Sequelize } = require('sequelize')
const sequelize = new Sequelize('hot_sentinel', 'root', 'root', {
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
})
```

### 1. keywords (关键词)

```sql
CREATE TABLE keywords (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  word            VARCHAR(255) NOT NULL COMMENT '关键词',
  enabled         TINYINT(1)   DEFAULT 1 COMMENT '是否启用',
  crawl_frequency INT           NULL COMMENT '采集频率(分钟), NULL=使用全局默认',
  last_checked_at DATETIME      NULL COMMENT '上次检查时间',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. hot_topics (热点话题)

```sql
CREATE TABLE hot_topics (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  scope       VARCHAR(255)  NULL COMMENT '热点范围(AI生成的scope标签逗号分隔)',
  keyword_id  INT           NULL COMMENT '关联关键词ID',
  title       VARCHAR(500)  NOT NULL COMMENT '热点标题(AI精炼后标题)',
  content     TEXT          NULL COMMENT '原始内容',
  likes       BIGINT        DEFAULT 0 COMMENT '点赞数',
  comments    BIGINT        DEFAULT 0 COMMENT '评论数',
  views       BIGINT        DEFAULT 0 COMMENT '查看数',
  video_url   VARCHAR(1000) NULL COMMENT '视频链接',
  image_url   VARCHAR(1000) NULL COMMENT '图片链接',
  summary     TEXT          NULL COMMENT 'AI 生成的摘要',
  importance  INT           DEFAULT 5 COMMENT '重要性评分 1-10',
  source      VARCHAR(100)  NOT NULL COMMENT '数据源标识',
  source_url  VARCHAR(1000) NULL COMMENT '原文链接',
  raw_data    JSON          NULL COMMENT '原始爬虫数据(完整保留)',
  ai_analysis JSON          NULL COMMENT 'AI 分析结果(isRelevant/credibility...)',
  capture_time DATETIME     NULL COMMENT '抓取时间',
  publish_time DATETIME     NULL COMMENT '帖子原始发布时间',
  is_notified TINYINT(1)    DEFAULT 0 COMMENT '是否已通知',

  -- Twitter 推文专用字段
  tweet_id               VARCHAR(100)  NULL COMMENT '推文ID',
  retweet_count          BIGINT        DEFAULT 0 COMMENT '转发数',
  quote_count            BIGINT        DEFAULT 0 COMMENT '引用数',
  bookmark_count         BIGINT        DEFAULT 0 COMMENT '书签数',
  tweet_created_at       DATETIME      NULL COMMENT '推文发布时间',
  tweet_lang             VARCHAR(10)   NULL COMMENT '推文语言',
  is_reply               TINYINT(1)    DEFAULT 0 COMMENT '是否回复推文',
  in_reply_to_id         VARCHAR(100)  NULL COMMENT '回复目标推文ID',
  conversation_id        VARCHAR(100)  NULL COMMENT '对话ID',
  is_limited_reply       TINYINT(1)    DEFAULT 0 COMMENT '是否限制回复',

  -- Twitter 作者信息字段
  author_user_name       VARCHAR(100)  NULL COMMENT '作者 @用户名',
  author_name            VARCHAR(200)  NULL COMMENT '作者显示名',
  author_id              VARCHAR(100)  NULL COMMENT '作者ID',
  author_verified        TINYINT(1)    DEFAULT 0 COMMENT '是否蓝V认证',
  author_verified_type   VARCHAR(50)   NULL COMMENT '认证类型',
  author_followers       BIGINT        DEFAULT 0 COMMENT '粉丝数',
  author_following       BIGINT        DEFAULT 0 COMMENT '关注数',
  author_profile_picture VARCHAR(1000) NULL COMMENT '头像URL',
  author_cover_picture   VARCHAR(1000) NULL COMMENT '封面图URL',
  author_description     TEXT          NULL COMMENT '作者简介',
  author_location        VARCHAR(200)  NULL COMMENT '所在地',
  author_created_at      DATETIME      NULL COMMENT '账号创建时间',
  author_favourites_count BIGINT       DEFAULT 0 COMMENT '收藏数',
  author_statuses_count  BIGINT        DEFAULT 0 COMMENT '发帖数',
  author_media_count     BIGINT        DEFAULT 0 COMMENT '媒体数',
  is_possibly_sensitive  TINYINT(1)    DEFAULT 0 COMMENT '是否敏感内容',

  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scope (scope),
  INDEX idx_keyword_id (keyword_id),
  INDEX idx_source (source),
  INDEX idx_created_at (created_at),
  INDEX idx_capture_time (capture_time)
);
```

### 3. notifications (通知)

```sql
CREATE TABLE notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  topic_id    INT           NULL COMMENT '关联热点ID',
  keyword_id  INT           NULL COMMENT '关联关键词ID',
  title       VARCHAR(500)  NOT NULL COMMENT '通知标题',
  content     TEXT          NULL COMMENT '通知内容',
  source      VARCHAR(100)  NULL COMMENT '数据源',
  source_url  VARCHAR(1000) NULL COMMENT '原文链接',
  importance  INT           DEFAULT 5 COMMENT '重要性评分',
  is_read     TINYINT(1)    DEFAULT 0 COMMENT '是否已读',
  publish_time DATETIME     NULL COMMENT '帖子原始发布时间',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
);
```

### 4. settings (设置)

```sql
CREATE TABLE settings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  `key`       VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
  `value`     TEXT         NOT NULL COMMENT '配置值',
  description VARCHAR(255) NULL COMMENT '配置说明',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 初始配置数据

```sql
INSERT INTO settings (`key`, `value`, `description`) VALUES
('email_enabled', 'true', '是否启用邮件通知'),
('email_to', '2906594394@qq.com', '通知接收邮箱（多个用英文逗号分隔）'),
('browser_notification_enabled', 'true', '是否启用浏览器通知'),
('default_crawl_frequency', '15', '默认采集频率(分钟): 5/15/30'),
('deepseek_model', 'deepseek-v4-flash', 'AI 模型: deepseek-v4-flash / spark-x / qwen-turbo'),
('ai_review_enabled', 'true', '是否启用 AI 审核(过滤假冒内容)'),
('crawl_source_twitter', 'true', 'Twitter/X 搜索开关'),
('crawl_source_bing', 'true', 'Bing 搜索开关'),
('crawl_source_so360', 'true', '360 搜索开关'),
('crawl_source_bilibili_search', 'true', 'B站搜索开关'),
('crawl_source_sogou', 'true', '搜狗搜索开关'),
('crawl_source_baidu_search', 'true', '百度搜索开关'),
('crawl_source_weibo_search', 'true', '微博搜索开关'),
('crawl_source_zhihu', 'true', '知乎搜索开关'),
('crawl_source_juejin', 'true', '掘金搜索开关'),
('crawl_source_csdn', 'true', 'CSDN搜索开关'),
('crawl_source_oschina', 'true', '开源中国搜索开关');
```

> 数据源开关 `crawl_source_xxx` 仅控制定时任务的采集行为；手动全网搜索不受此开关限制。

### 5. topic_snapshots (热点快照 - 用于趋势追踪)

```sql
CREATE TABLE topic_snapshots (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  topic_id      INT       NOT NULL COMMENT '关联热点ID',
  snapshot_time DATETIME  NOT NULL COMMENT '快照时间',
  likes         BIGINT    DEFAULT 0 COMMENT '当时点赞数',
  comments      BIGINT    DEFAULT 0 COMMENT '当时评论数',
  views         BIGINT    DEFAULT 0 COMMENT '当时浏览量',
  importance    INT       DEFAULT 5 COMMENT '当时重要性评分',
  INDEX idx_topic_id (topic_id),
  INDEX idx_snapshot_time (snapshot_time),
  INDEX idx_topic_time (topic_id, snapshot_time)
);
```

> 注意：`topic_snapshots` 表 `timestamps: false`，不使用 Sequelize 自动时间戳。

### ER 关系

```
settings              keywords              hot_topics              notifications
┌──────────┐         ┌──────────┐          ┌──────────────────┐   ┌──────────────┐
│ id (PK)  │         │ id (PK)  │◄─────────│ keyword_id       │   │ id (PK)      │
│ key      │         │ word     │          │ id (PK)          │──►│ topic_id     │
│ value    │         │ enabled  │          │ scope            │   │ keyword_id   │
│ desc     │         │ crawl_   │          │ title            │   │ title        │
│          │         │ frequency│          │ content          │   │ content      │
│          │         │ last_    │          │ likes/comments/  │   │ source       │
│          │         │ checked  │          │ views            │   │ source_url   │
└──────────┘         └──────────┘          │ summary (AI)     │   │ importance   │
                                            │ importance       │   │ is_read      │
                                            │ source/source_url│   │ publish_time │
                                            │ raw_data         │   └──────────────┘
                                            │ ai_analysis      │
               topic_snapshots              │ tweet 相关字段    │
               ┌──────────────┐             │ author 相关字段   │
               │ id (PK)      │             │ is_notified      │
               │ topic_id ────┼────────────►│                  │
               │ snapshot_time│             └──────────────────┘
               │ likes        │
               │ comments     │
               │ views        │
               │ importance   │
               └──────────────┘
```

## 环境变量配置（.env）

```env
# 服务器端口
PORT=3000

# 本地AI模型配置 (Ollama)
USE_LOCAL_AI=true                          # 是否使用本地Ollama
OLLAMA_BASE_URL=http://localhost:11434      # Ollama 服务地址
OLLAMA_DEFAULT_MODEL=gemma3:4b              # 默认模型 (gemma3:4b / qwen3.5:4b)
```

## 项目目录结构

```
vue-hot/
├── .env                          # 环境变量（AI 模式/端口等）
├── package.json                  # 项目依赖（含 concurrently 双启动）
├── index.js                      # 根入口（独立爬虫测试脚本）
├── client/                       # 前端
│   ├── src/
│   │   ├── App.vue               # 根组件（Header/Nav/Toast/Socket 连接）
│   │   ├── main.js               # 入口（createApp + router + global.css）
│   │   ├── utils.js              # 工具函数（sanitizeHtml 等）
│   │   ├── router/
│   │   │   └── index.js          # 6 路由（/dashboard /monitor /discovery /search /notifications /settings）
│   │   ├── composables/
│   │   │   └── useAppStore.js    # 全局状态（online/toast/time/unread/socket/sources/工具函数）
│   │   ├── api/
│   │   │   └── index.js          # REST API 封装（axios 实例）
│   │   ├── components/
│   │   │   ├── HsDialog.vue      # 通用模态框（拖拽/全屏/动画）
│   │   │   ├── FilterBar.vue     # 过滤器栏（排序/来源/重要性/状态/媒体）
│   │   │   └── Pagination.vue    # 分页组件
│   │   ├── views/
│   │   │   ├── Dashboard.vue     # 仪表盘（ECharts × 4 图表 + 排行）
│   │   │   ├── KeywordMonitor.vue # 关键词监控（CRUD + 频率 + 导出）
│   │   │   ├── HotDiscovery.vue  # 热点发现（排序/过滤/趋势/预览）
│   │   │   ├── SearchView.vue    # 全网搜索（实时采集 + AI 分析）
│   │   │   ├── NotificationCenter.vue # 通知中心（标记已读/导出）
│   │   │   └── SettingsPanel.vue # 系统设置（通知/AI/数据源/本地模型）
│   │   └── styles/
│   │       └── global.css        # 全局样式（Terminal Hacker 主题）
│   ├── index.html
│   └── vite.config.js            # Vite 配置（proxy /api → :3000）
├── server/                        # 后端
│   ├── index.js                   # Express + Socket.IO 入口
│   ├── config/
│   │   └── database.js            # Sequelize + MySQL 连接
│   ├── models/
│   │   ├── index.js               # 模型注册 + 关联定义
│   │   ├── Keyword.js             # 关键词模型
│   │   ├── HotTopic.js            # 热点话题模型(含 Twitter 字段)
│   │   ├── Notification.js        # 通知模型
│   │   ├── Setting.js             # 设置模型
│   │   └── TopicSnapshot.js       # 热点快照模型(趋势追踪)
│   ├── routes/
│   │   ├── keywords.js            # 关键词 CRUD
│   │   ├── hotTopics.js           # 热点查询 + 趋势 API
│   │   ├── notifications.js       # 通知查询 + 标记已读
│   │   ├── search.js              # 全网搜索 + 搜索建议
│   │   ├── dashboard.js           # 仪表盘统计数据聚合
│   │   └── settings.js            # 设置 CRUD + AI 状态 API
│   ├── services/
│   │   ├── crawler.js             # 爬虫模块 (16源 + 并发控制)
│   │   ├── aiAnalyzer.js          # AI 分析（多后端路由/降级/关键词分析/热点总结）
│   │   ├── ollamaAnalyzer.js      # 本地 Ollama 调用 + JSON 解析
│   │   ├── sparkAnalyzer.js       # 讯飞 Spark 调用
│   │   ├── qwenAnalyzer.js        # 通义千问 调用
│   │   ├── twitterSearch.js       # Twitter API 搜索 + 数据映射
│   │   ├── scheduler.js           # 定时调度（按频率分组 + 快照创建）
│   │   ├── emailNotifier.js       # 邮件通知（HTML 模板 + 批量发送）
│   │   ├── browserNotifier.js     # 浏览器 WebSocket 通知推送
│   │   ├── settingsCache.js       # 设置内存缓存（5min TTL + WebSocket 广播）
│   │   └── prompts/
│   │       ├── keywordAnalysis.txt # AI 关键词审核提示词模板
│   │       └── hotTopicSummary.txt # AI 热点总结提示词模板
│   └── scripts/
│       └── init-db.js             # 数据库初始化脚本（重置 + 建表 + 种子数据）
├── skills/
│   └── hot-sentinel-skill.md      # Agent Skills
└── dist/                          # 前端构建产物
```

## NPM 依赖清单

### 生产依赖

| 包名                       | 用途                         |
| -------------------------- | ---------------------------- |
| @ant-design/icons-vue      | Vue 图标组件                  |
| axios                      | HTTP 客户端（前后端共用）      |
| cheerio                    | 服务端 HTML 解析（爬虫）       |
| concurrently               | 前后端并行启动                 |
| cors                       | 跨域中间件                    |
| dayjs                      | 日期处理                      |
| dotenv                     | 环境变量加载                  |
| echarts                    | 图表库                        |
| express                    | Web 服务框架                  |
| file-saver                 | 文件下载                      |
| mysql2                     | MySQL 驱动                    |
| node-cron                  | 定时任务调度                  |
| nodemailer                 | 邮件发送                      |
| openai                     | OpenAI SDK（DeepSeek/Spark/Qwen） |
| puppeteer-core             | 无头浏览器（预留）             |
| sequelize                  | ORM 框架                      |
| socket.io                  | WebSocket（服务端）            |
| socket.io-client           | WebSocket（客户端）            |
| vue-echarts                | Vue ECharts 集成              |
| vue-router                 | Vue SPA 路由                  |
| xlsx                       | Excel 导出                    |
| xml2js                     | XML 解析（RSS）               |

### 开发依赖

| 包名                  | 用途          |
| --------------------- | ------------- |
| @vitejs/plugin-vue    | Vite Vue 插件 |
| vite                  | 构建工具      |

## NPM Scripts

| 命令        | 说明                         |
| ----------- | ---------------------------- |
| `npm run dev` | 同时启动前后端（concurrently） |
| `npm run dev:server` | 启动 Express 后端 |
| `npm run dev:client` | 启动 Vite 前端开发服务器 |
| `npm run build` | 构建前端到 dist/ 目录 |
| `npm run db:init` | 初始化数据库（删除重建所有表 + 种子数据） |

<template>
  <div class="bento-grid">
    <div class="bento-card span-2">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          数据总览
        </div>
        <span class="text-muted" style="font-size: 0.65rem">实时统计</span>
      </div>
      <div class="stats-grid">
        <div class="stat-card-mini" style="--stat-color: var(--accent-cyan)">
          <div class="stat-mini-value">{{ animatedStats.totalTopics }}</div>
          <div class="stat-mini-label">热点总数</div>
          <div class="stat-mini-delta" v-if="stats.overview.todayTopics > 0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M18 15l-6-6-6 6" />
            </svg>
            +{{ stats.overview.todayTopics }} 今日
          </div>
        </div>
        <div class="stat-card-mini" style="--stat-color: var(--accent-green)">
          <div class="stat-mini-value">{{ animatedStats.activeKeywords }}</div>
          <div class="stat-mini-label">活跃关键词</div>
          <div class="stat-mini-delta">{{ stats.overview.totalKeywords }} 总计</div>
        </div>
        <div class="stat-card-mini" style="--stat-color: var(--accent-red)">
          <div class="stat-mini-value">{{ animatedStats.unreadNotifications }}</div>
          <div class="stat-mini-label">未读通知</div>
          <div class="stat-mini-delta">{{ stats.overview.totalNotifications }} 总计</div>
        </div>
        <div class="stat-card-mini" style="--stat-color: var(--accent-purple)">
          <div class="stat-mini-value">{{ animatedStats.aiAnalysisRate }}%</div>
          <div class="stat-mini-label">AI 分析率</div>
          <div class="stat-mini-delta">DeepSeek V4</div>
        </div>
      </div>
    </div>

    <div class="bento-card span-2">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          近7天趋势
        </div>
      </div>
      <div ref="dailyTrendChartRef" class="chart-container"></div>
    </div>

    <div class="bento-card span-2">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
            </svg>
          </div>
          数据源分布
        </div>
      </div>
      <div ref="sourcePieChartRef" class="chart-container"></div>
    </div>

    <div class="bento-card span-2">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          24小时采集量
        </div>
      </div>
      <div ref="hourlyBarChartRef" class="chart-container"></div>
    </div>

    <div class="bento-card span-2">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" stroke-width="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          重要性分布
        </div>
      </div>
      <div ref="importanceRadarChartRef" class="chart-container"></div>
    </div>

    <div class="bento-card span-4">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2.5">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
          </div>
          关键词活跃度排行 TOP 10
        </div>
      </div>
      <div v-if="stats.topKeywords && stats.topKeywords.length > 0" class="keyword-rank-list">
        <div v-for="(kw, idx) in stats.topKeywords" :key="kw.id" class="rank-item" :class="{ 'rank-top3': idx < 3 }">
          <span class="rank-num" :class="'rank-' + (idx + 1)">{{ idx + 1 }}</span>
          <div class="rank-info">
            <span class="rank-word">{{ kw.word }}</span>
            <span :class="['badge', kw.enabled ? 'badge-green' : 'badge-gray']" style="font-size: 0.55rem">{{ kw.enabled ? '监控中' : '已暂停' }}</span>
          </div>
          <div class="rank-bar-wrap">
            <div class="rank-bar" :style="{ width: getRankBarWidth(kw.topicCount) + '%' }"></div>
          </div>
          <span class="rank-count">{{ kw.topicCount }} 条</span>
        </div>
      </div>
      <div v-else class="empty-state" style="padding: 40px 0">
        <p>暂无关键词数据</p>
        <p style="font-size: 0.72rem">添加关键词后将在此显示活跃度排行</p>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { getDashboardStats } from '../api'

export default {
  name: 'Dashboard',
  setup() {
    const dailyTrendChartRef = ref()
    const sourcePieChartRef = ref()
    const hourlyBarChartRef = ref()
    const importanceRadarChartRef = ref()

    let dailyTrendChart = null
    let sourcePieChart = null
    let hourlyBarChart = null
    let importanceRadarChart = null

    const stats = reactive({
      overview: {},
      sourceDistribution: [],
      importanceDistribution: [],
      hourlyDistribution: [],
      dailyTrend: [],
      topKeywords: [],
      aiAnalysisRate: 0
    })

    const animatedStats = reactive({
      totalTopics: 0,
      activeKeywords: 0,
      unreadNotifications: 0,
      aiAnalysisRate: 0
    })

    function animateNumber(target, key, duration = 800) {
      const start = animatedStats[key] || 0
      const end = target
      if (start === end) return
      const startTime = performance.now()

      function update(currentTime) {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        animatedStats[key] = Math.round(start + (end - start) * eased)
        if (progress < 1) requestAnimationFrame(update)
      }

      requestAnimationFrame(update)
    }

    function getRankBarWidth(count) {
      const max = Math.max(...stats.topKeywords.map(k => k.topicCount), 1)
      return Math.max((count / max) * 100, 8)
    }

    function initDailyTrendChart() {
      if (!dailyTrendChartRef.value) return
      dailyTrendChart = echarts.init(dailyTrendChartRef.value)
      const option = {
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(15, 15, 25, 0.95)',
          borderColor: 'rgba(0, 229, 255, 0.2)',
          textStyle: { color: '#ccc', fontSize: 12 }
        },
        grid: { top: 30, right: 20, bottom: 25, left: 45 },
        xAxis: {
          type: 'category',
          data: [],
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
          axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 }
        },
        series: [
          {
            type: 'line',
            data: [],
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { color: '#00e5ff', width: 2 },
            itemStyle: { color: '#00e5ff' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                {
                  offset: 0,
                  color: 'rgba(0, 229, 255, 0.25)'
                },
                { offset: 1, color: 'rgba(0, 229, 255, 0.02)' }
              ])
            }
          }
        ]
      }
      dailyTrendChart.setOption(option)
    }

    function initSourcePieChart() {
      if (!sourcePieChartRef.value) return
      sourcePieChart = echarts.init(sourcePieChartRef.value)
      const colors = ['#00e5ff', '#76ff03', '#ffea00', '#ff1744', '#e040fb', '#ff6e40', '#7c4dff', '#18ffff', '#69f0ae', '#ffd740', '#f50057', '#00bfa5']
      const option = {
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(15, 15, 25, 0.95)',
          borderColor: 'rgba(0, 229, 255, 0.2)',
          textStyle: { color: '#ccc', fontSize: 12 },
          formatter: '{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          right: 5,
          top: 'center',
          textStyle: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 8
        },
        series: [
          {
            type: 'pie',
            radius: ['35%', '65%'],
            center: ['38%', '50%'],
            avoidLabelOverlap: false,
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold', color: '#fff' } },
            labelLine: { show: false },
            data: [],
            itemStyle: { borderRadius: 4, borderColor: '#0a0a0f', borderWidth: 2 },
            color: colors
          }
        ]
      }
      sourcePieChart.setOption(option)
    }

    function initHourlyBarChart() {
      if (!hourlyBarChartRef.value) return
      hourlyBarChart = echarts.init(hourlyBarChartRef.value)
      const option = {
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(15, 15, 25, 0.95)',
          borderColor: 'rgba(0, 229, 255, 0.2)',
          textStyle: { color: '#ccc', fontSize: 12 }
        },
        grid: { top: 15, right: 15, bottom: 25, left: 40 },
        xAxis: {
          type: 'category',
          data: [],
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 9, interval: 3 }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
          axisLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 10 }
        },
        series: [
          {
            type: 'bar',
            data: [],
            barWidth: '55%',
            itemStyle: {
              borderRadius: [3, 3, 0, 0],
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#76ff03' },
                { offset: 1, color: 'rgba(118, 255, 3, 0.15)' }
              ])
            },
            emphasis: {
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  {
                    offset: 0,
                    color: '#b2ff59'
                  },
                  { offset: 1, color: 'rgba(178, 255, 89, 0.3)' }
                ])
              }
            }
          }
        ]
      }
      hourlyBarChart.setOption(option)
    }

    function initImportanceRadarChart() {
      if (!importanceRadarChartRef.value) return
      importanceRadarChart = echarts.init(importanceRadarChartRef.value)
      const levels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
      const option = {
        tooltip: {
          backgroundColor: 'rgba(15, 15, 25, 0.95)',
          borderColor: 'rgba(0, 229, 255, 0.2)',
          textStyle: { color: '#ccc', fontSize: 12 }
        },
        radar: {
          indicator: levels.map(l => ({
            name: l,
            max: Math.max(...stats.importanceDistribution.map(i => i['count']), 10)
          })),
          shape: 'circle',
          splitNumber: 3,
          axisName: {
            color: 'rgba(255,255,255,0.5)',
            fontSize: 9
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(255,255,255,0.08)'
            }
          },
          splitArea: {
            areaStyle: {
              color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)']
            }
          },
          axisLine: {
            lineStyle: {
              color: 'rgba(255,255,255,0.1)'
            }
          }
        },

        series: [
          {
            type: 'radar',
            data: [
              {
                value: [],
                name: '重要性分布',
                areaStyle: { color: 'rgba(255, 23, 68, 0.15)' },
                lineStyle: { color: '#ff1744', width: 1.5 },
                itemStyle: { color: '#ff1744' }
              }
            ]
          }
        ]
      }
      importanceRadarChart.setOption(option)
    }

    async function loadStats() {
      try {
        const res = await getDashboardStats()
        const data = res.data.data

        Object.assign(stats.overview, data.overview)
        stats.sourceDistribution = data.sourceDistribution || []
        stats.importanceDistribution = data.importanceDistribution || []
        stats.hourlyDistribution = data.hourlyDistribution || []
        stats.dailyTrend = data.dailyTrend || []
        stats.topKeywords = data.topKeywords || []
        stats.aiAnalysisRate = data.aiAnalysisRate || 0

        animateNumber(data.overview.totalTopics || 0, 'totalTopics')
        animateNumber(data.overview.activeKeywords || 0, 'activeKeywords')
        animateNumber(data.overview.unreadNotifications || 0, 'unreadNotifications')
        animateNumber(data.aiAnalysisRate || 0, 'aiAnalysisRate')

        updateCharts()
      } catch (e) {
        console.error('[Dashboard] 加载统计数据失败:', e)
      }
    }

    function updateCharts() {
      if (dailyTrendChart) {
        dailyTrendChart.setOption({
          xAxis: { data: stats.dailyTrend.map(d => d.date) },
          series: [{ data: stats.dailyTrend.map(d => d.count) }]
        })
      }
      if (sourcePieChart) {
        sourcePieChart.setOption({
          series: [
            {
              data: stats.sourceDistribution.map(s => ({
                name: s.name,
                value: s.value
              }))
            }
          ]
        })
      }
      if (hourlyBarChart) {
        hourlyBarChart.setOption({
          xAxis: { data: stats.hourlyDistribution.map(h => h.hour) },
          series: [{ data: stats.hourlyDistribution.map(h => h.count) }]
        })
      }
      if (importanceRadarChart) {
        const importanceData = []
        for (let i = 1; i <= 10; i++) {
          const found = stats.importanceDistribution.find(item => item.importance === i)
          importanceData.push(found ? found.count : 0)
        }
        const maxVal = Math.max(...importanceData, 10)
        importanceRadarChart.setOption({
          radar: { indicator: Array.from({ length: 10 }, (_, i) => ({ name: String(i + 1), max: maxVal })) },
          series: [{ data: [{ value: importanceData }] }]
        })
      }
    }

    function handleResize() {
      dailyTrendChart && dailyTrendChart.resize()
      sourcePieChart && sourcePieChart.resize()
      hourlyBarChart && hourlyBarChart.resize()
      importanceRadarChart && importanceRadarChart.resize()
    }

    onMounted(() => {
      loadStats()
      setTimeout(() => {
        initDailyTrendChart()
        initSourcePieChart()
        initHourlyBarChart()
        initImportanceRadarChart()
        updateCharts()
      }, 100)
      window.addEventListener('resize', handleResize)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      dailyTrendChart && dailyTrendChart.dispose()
      sourcePieChart && sourcePieChart.dispose()
      hourlyBarChart && hourlyBarChart.dispose()
      importanceRadarChart && importanceRadarChart.dispose()
    })

    return {
      stats,
      animatedStats,
      dailyTrendChartRef,
      sourcePieChartRef,
      hourlyBarChartRef,
      importanceRadarChartRef,
      getRankBarWidth
    }
  }
}
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.stat-card-mini {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 14px 12px;
  text-align: center;
  transition: all 0.3s ease;
}

.stat-card-mini:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--stat-color, rgba(255, 255, 255, 0.1));
  box-shadow: 0 0 20px color-mix(in srgb, var(--stat-color, #fff) 10%, transparent);
}

.stat-mini-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--stat-color, var(--text-primary));
  font-family: 'JetBrains Mono', monospace;
  text-shadow: 0 0 20px color-mix(in srgb, var(--stat-color, #fff) 20%, transparent);
  line-height: 1.2;
}

.stat-mini-label {
  font-size: 0.68rem;
  color: var(--text-secondary);
  margin-top: 4px;
  letter-spacing: 0.5px;
}

.stat-mini-delta {
  font-size: 0.58rem;
  color: var(--stat-color, var(--accent-green));
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.chart-container {
  width: 100%;
  height: 240px;
}

.keyword-rank-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.rank-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.rank-num {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #000;
}

.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #000;
}

.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #b8860b);
  color: #fff;
}

.rank-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 120px;
  flex-shrink: 0;
}

.rank-word {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
}

.rank-bar-wrap {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
}

.rank-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-green));
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.rank-count {
  font-size: 0.7rem;
  color: var(--text-muted);
  min-width: 42px;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-container {
    height: 200px;
  }
}
</style>

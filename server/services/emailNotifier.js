const nodemailer = require('nodemailer');
const settingsCache = require('./settingsCache');

const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: '2381345593@qq.com',
    pass: 'bytruzmkfmdiecfd',
  },
});

function parseEmails(value) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0 && email.includes('@'));
}

async function getEmailTo() {
  try {
    const value = settingsCache.getSetting('email_to', '2381345593@qq.com');
    const emails = parseEmails(value);
    return emails.length > 0 ? emails : ['2381345593@qq.com'];
  } catch {
    return ['2381345593@qq.com'];
  }
}

function generateBatchEmailHtml(alertData) {
  const { topicCount, keywordCount, timestamp, groups } = alertData;
  const timeStr = new Date(timestamp).toLocaleString('zh-CN');

  let itemsHtml = '';

  Object.entries(groups).forEach(([keyword, topics]) => {
    itemsHtml += `
      <div style="margin-bottom:20px;">
        <div style="background:#1a1a2e;padding:10px 14px;border-left:3px solid #00ff88;border-radius:4px;margin-bottom:12px;">
          <span style="color:#00ff88;font-weight:bold;font-size:15px;">🔑 ${keyword}</span>
          <span style="float:right;color:#888;font-size:13px;">${topics.length} 条新热点</span>
        </div>
        ${topics.map((topic, idx) => {
      const importanceColor =
        topic.importance >= 8 ? '#ff1744' :
          topic.importance >= 6 ? '#ffc107' :
            topic.importance >= 4 ? '#00bcd4' : '#666';

      const sourceBadge = getSourceStyle(topic.source);

      return `
            <div style="background:#111122;border:1px solid #222;border-radius:8px;padding:16px;margin-bottom:10px;transition:border-color 0.2s;" onmouseover="this.style.borderColor='#333'" onmouseout="this.style.borderColor='#222'">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td valign="top" style="padding-right:12px;">
                    <div style="width:28px;height:28px;background:${importanceColor}22;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;color:${importanceColor};">${idx + 1}</div>
                  </td>
                  <td valign="top" width="100%">
                    <div style="font-weight:600;font-size:15px;color:#e0e0e0;margin-bottom:6px;line-height:1.5;">
                      ${escapeHtml(topic.title)}
                    </div>
                    ${topic.summary ? `<div style="font-size:13px;color:#888;line-height:1.6;margin-bottom:10px;">${escapeHtml(topic.summary)}</div>` : ''}
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                      <span style="${sourceBadge.style};font-size:11px;padding:3px 8px;border-radius:4px;">${sourceBadge.label}</span>
                      <span style="color:#666;font-size:12px;">⚡ 重要性: <strong style="color:${importanceColor}">${topic.importance}/10</strong></span>
                      ${topic.views ? `<span style="color:#666;font-size:12px;">👁 ${formatNumber(topic.views)}</span>` : ''}
                      ${topic.likes ? `<span style="color:#666;font-size:12px;">❤️ ${formatNumber(topic.likes)}</span>` : ''}
                      ${topic.comments ? `<span style="color:#666;font-size:12px;">💬 ${formatNumber(topic.comments)}</span>` : ''}
                    </div>
                    ${topic.source_url ? `
                      <div style="margin-top:10px;">
                        <a href="${topic.source_url}" style="display:inline-block;color:#00aaff;text-decoration:none;font-size:13px;padding:6px 14px;background:#00aaff11;border:1px solid #00aaff33;border-radius:5px;transition:all 0.2s;" onmouseover="this.style.background='#00aaff22'" onmouseout="this.style.background='#00aaff11'">📎 查看原文 →</a>
                      </div>` : ''}
                  </td>
                </tr>
              </table>
            </div>`;
    }).join('')}
      </div>`;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:20px;background:#080810;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:700px;margin:0 auto;background:#0c0c18;border:1px solid #1a1a2e;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.5);">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0d1117,#161b22);padding:28px 24px;border-bottom:1px solid #1a1a2e;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <h1 style="margin:0;color:#fff;font-size:22px;display:flex;align-items:center;gap:10px;">
                  <span>�️</span>
                  <span>热点哨兵</span>
                  <span style="background:#ff1744;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:normal;margin-left:6px;">NEW</span>
                </h1>
                <p style="margin:8px 0 0;color:#888;font-size:14px;">监控周期内发现的新热点汇总报告</p>
              </td>
              <td align="right" valign="bottom">
                <p style="margin:0;color:#555;font-size:12px;">${timeStr}</p>
              </td>
            </tr>
          </table>
        </div>

        <!-- Stats -->
        <div style="display:flex;gap:12px;padding:20px 24px;background:#0a0a14;border-bottom:1px solid #1a1a2e;">
          <div style="flex:1;background:#111;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:bold;color:#00ff88;">${topicCount}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">新热点总数</div>
          </div>
          <div style="flex:1;background:#111;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:bold;color:#00aaff;">${keywordCount}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">涉及关键词</div>
          </div>
          <div style="flex:1;background:#111;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:bold;color:#ffc107;">${Object.keys(groups).length}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">数据来源</div>
          </div>
        </div>

        <!-- Content -->
        <div style="padding:24px;">
          ${itemsHtml}
        </div>

        <!-- Footer -->
        <div style="background:#0a0a14;padding:20px 24px;border-top:1px solid #1a1a2e;text-align:center;">
          <p style="margin:0;color:#444;font-size:12px;">
            此邮件由 <strong style="color:#666;">热点哨兵 (Hot Sentinel)</strong> 自动生成并发送<br>
            <span style="color:#333;">如不再接收此类通知，请在系统设置中关闭邮件通知</span>
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNumber(n) {
  if (!n) return '0';
  n = Number(n);
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function getSourceStyle(source) {
  const styles = {
    twitter: { label: 'X/Twitter', style: 'background:#1da1f222;color:#1da1f2;border:1px solid #1da1f255' },
    bing: { label: 'Bing搜索', style: 'background:#00809d22;color:#00809d;border:1px solid #00809d55' },
    so360: { label: '360搜索', style: 'background:#22c32e22;color:#22c32e;border:1px solid #22c32e55' },
    bilibili_search: { label: 'B站搜索', style: 'background:#00a1d622;color:#00a1d6;border:1px solid #00a1d655' },
    baidu_search: { label: '百度搜索', style: 'background:#2932e122;color:#2932e1;border:1px solid #2932e155' },
    weibo_search: { label: '微博搜索', style: 'background:#ff820022;color:#ff8200;border:1px solid #ff820055' },
    sogou: { label: '搜狗搜索', style: 'background:#65c54622;color:#65c546;border:1px solid #65c54655' },
    baidu: { label: '百度热搜', style: 'background:#de140f22;color:#de140f;border:1px solid #de140f55' },
    weibo: { label: '微博热搜', style: 'background:#ff820022;color:#ff8200;border:1px solid #ff820055' },
    bilibili: { label: 'B站热搜', style: 'background:#00a1d622;color:#00a1d6;border:1px solid #00a1d655' },
    tencent: { label: '腾讯新闻', style: 'background:#1e90ff22;color:#1e90ff;border:1px solid #1e90ff55' },
    rss: { label: 'RSS订阅', style: 'background:#ff660022;color:#ff6600;border:1px solid #ff660055' },
  };
  return styles[source] || { label: source || '未知', style: 'background:#444;color:#aaa;border:1px solid #666' };
}

async function sendBatchAlerts(alertList) {
  if (!settingsCache.isEmailEnabled()) {
    console.log(`[Email] 邮件通知已禁用，跳过批量发送 (${alertList.length} 条)`);
    return false;
  }

  if (!alertList || alertList.length === 0) {
    console.log('[Email] 没有需要发送的通知');
    return false;
  }

  const recipients = await getEmailTo();

  const groups = {};
  alertList.forEach(item => {
    const kw = item.keyword || '未知';
    if (!groups[kw]) groups[kw] = [];
    groups[kw].push(item.topic);
  });

  const alertData = {
    topicCount: alertList.length,
    keywordCount: Object.keys(groups).length,
    timestamp: new Date(),
    groups,
  };

  const html = generateBatchEmailHtml(alertData);

  const mailOptions = {
    from: `"热点哨兵" <2381345593@qq.com>`,
    to: recipients.join(', '),
    subject: `[热点哨兵] 监控周期汇总 - 发现 ${alertList.length} 个新热点`,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email] 批量邮件已发送 → ${recipients.length} 人 | 共 ${alertList.length} 条热点 | ${Object.keys(groups).length} 个关键词`);
    return true;
  } catch (err) {
    console.error('[Email] 批量邮件发送失败:', err.message);
    throw err;
  }
}

module.exports = { sendBatchAlerts, isEmailEnabled: settingsCache.isEmailEnabled, getEmailTo, parseEmails };

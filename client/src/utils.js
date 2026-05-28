// 7. 工具函数：过滤 XSS 标签
export function sanitizeHtml(html) {
    // 移除所有标签，但保留文字中的 <> 字面符
    // 内容替换
    let replace = html.replace(/<\/?[^>]+(>|$)/g, '');
    return `<em class="keyword">${replace}</em>`
}
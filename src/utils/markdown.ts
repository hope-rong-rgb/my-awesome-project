import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

/**
 * 创建Markdown解析器实例
 */
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: function (str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          `<pre class="hljs"><code class="language-${lang}">` +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
        )
      } catch (error) {
        console.error('代码高亮失败:', error)
      }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
  },
})

/**
 * 自定义代码块渲染
 */
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx]
  const lang = token.info.trim()
  const codeContent = token.content

  // 使用highlight.js高亮代码
  const highlighted =
    lang && hljs.getLanguage(lang)
      ? hljs.highlight(codeContent, { language: lang, ignoreIllegals: true }).value
      : md.utils.escapeHtml(codeContent)

  // 语言标签
  const langLabel = lang || 'text'

  // 安全的代码内容(用于data属性)
  const safeCode = codeContent
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-language">${langLabel}</span>
        <button class="copy-code-button" onclick="window.copyCodeToClipboard(this)" data-code="${safeCode}">
          复制代码
        </button>
      </div>
      <div class="code-block">
        <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
      </div>
    </div>
  `
}

/**
 * 行内代码渲染
 */
md.renderer.rules.code_inline = (tokens, idx) => {
  const token = tokens[idx]
  return `<code class="inline-code">${md.utils.escapeHtml(token.content)}</code>`
}

/**
 * 标题渲染优化
 */
md.renderer.rules.heading_open = (tokens, idx) => {
  const token = tokens[idx]
  const level = token.tag.slice(1)
  return `<${token.tag} class="markdown-heading markdown-h${level}">`
}

/**
 * 段落渲染优化
 */
md.renderer.rules.paragraph_open = () => {
  return '<p class="markdown-paragraph">'
}

/**
 * 列表项渲染优化
 */
md.renderer.rules.list_item_open = () => {
  return '<li class="markdown-list-item">'
}

/**
 * 渲染Markdown内容
 */
export const renderMarkdown = (content: string): string => {
  if (!content) return ''

  // 预处理内容
  const processedContent = content
    .replace(/\n{3,}/g, '\n\n') // 合并多个空行
    .trim()

  return md.render(processedContent)
}

/**
 * 渲染纯文本(安全处理)
 */
export const renderText = (text: string): string => {
  return text
    .split('\n')
    .map((line) => {
      const trimmedLine = line.trim()
      if (trimmedLine === '') {
        return '<div class="text-empty-line"><br></div>'
      }

      // 检测列表项
      if (/^[•\-*\d+]\.?\s/.test(trimmedLine)) {
        return `<div class="text-list-item">${md.utils.escapeHtml(trimmedLine)}</div>`
      }

      return `<div class="text-paragraph">${md.utils.escapeHtml(trimmedLine)}</div>`
    })
    .join('')
}

/**
 * 智能检测内容是否包含Markdown语法
 */
const hasMarkdownSyntax = (content: string): boolean => {
  const patterns = [
    /^#{1,6}\s/m, // 标题
    /\*\*.*\*\*/, // 粗体
    /__.*__/, // 粗体
    /\*.*\*/, // 斜体
    /_.*_/, // 斜体
    /`[^`]+`/, // 行内代码
    /```[\s\S]*```/, // 代码块
    /\[.*\]\(.*\)/, // 链接
    /^[-*+]\s/m, // 无序列表
    /^\d+\.\s/m, // 有序列表
    /^\|.*\|.*\|/m, // 表格
    /^>\s/m, // 引用
  ]

  return patterns.some((pattern) => pattern.test(content))
}

/**
 * 智能渲染消息内容
 */
export const renderMessageContent = (content: string): string => {
  if (!content) return ''

  // 清理内容
  const cleanedContent = content
    .replace(/```markdown\s*复制代码\s*/g, '')
    .replace(/```plaintext\s*/g, '')
    .replace(/```\s*$/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // 检测是否包含Markdown语法
  if (hasMarkdownSyntax(cleanedContent)) {
    return renderMarkdown(cleanedContent)
  }

  // 否则使用纯文本渲染
  return renderText(cleanedContent)
}

/**
 * 复制代码到剪贴板
 */
const copyCodeToClipboard = async (button: HTMLElement): Promise<void> => {
  const code = button.getAttribute('data-code')
  if (!code) return

  try {
    // 解码HTML实体
    const decodedCode = code
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')

    await navigator.clipboard.writeText(decodedCode)

    // 添加复制成功反馈
    const originalText = button.textContent
    button.textContent = '已复制!'
    button.classList.add('copied')

    setTimeout(() => {
      button.textContent = originalText
      button.classList.remove('copied')
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 将函数挂载到全局
if (typeof window !== 'undefined') {
  window.copyCodeToClipboard = copyCodeToClipboard
}

// 声明全局类型
declare global {
  interface Window {
    copyCodeToClipboard: (button: HTMLElement) => Promise<void>
  }
}

export { hasMarkdownSyntax }
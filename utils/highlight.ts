import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
export const highlightCode = (content: string): string => {
  const codeBlockRegex = /```(\w+)?\s*\n?([\s\S]*?)\s*```/g
  return content.replace(codeBlockRegex, (match, language, code) => {
    if (!code || code.trim() === '') return match
    const validLanguage = hljs.getLanguage(language) ? language : 'plaintext'
    try {
      const cleanedCode = code.trim()
      const highlighted = hljs.highlight(cleanedCode, { language: validLanguage }).value
      return `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-language">${validLanguage}</span>
            <button class="copy-code-button" onclick="copyCodeToClipboard(this)" data-code="${cleanedCode.replace(/"/g, '&quot;')}">复制代码</button>
          </div>
          <div class="code-block">
            <pre class="hljs"><code class="language-${validLanguage}">${highlighted}</code></pre>
          </div>
        </div>
      `
    } catch (error) {
      console.error('高亮失败', error)
      return `<pre class="hljs"><code>${code.trim()}</code></pre>`
    }
  })
}
// 处理行内代码
export const highlightInlineCode = (content: string): string => {
  return content
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>')
}

// markdown.ts
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

const detectContentScene = (content: string): SceneType => {
  const scenePatterns = {
    knowledge: ['是什么', '什么是', '介绍', '解释', '概念', '定义', '含义'],
    guide: ['怎么', '如何', '步骤', '方法', '教程', '指南', '操作'],
    compare: ['区别', '对比', '哪个好', '优缺点', '比较', 'vs', ' Versus'],
    recommendation: ['推荐', '建议', '选择', '哪个', '最好', '优选'],
    technical: ['代码', '编程', '实现', '技术', '配置', '安装', '调试'],
    creative: ['创意', '想法', '策划', '方案', '设计', '构思'],
    analysis: ['分析', '解读', '看法', '观点', '评价', '评论'],
  } as const

  const lowerContent = content.toLowerCase()

  for (const [scene, keywords] of Object.entries(scenePatterns)) {
    if (keywords.some((keyword) => lowerContent.includes(keyword))) {
      return scene as SceneType
    }
  }

  return 'general'
}

type SceneType =
  | 'knowledge'
  | 'guide'
  | 'compare'
  | 'recommendation'
  | 'technical'
  | 'creative'
  | 'analysis'
  | 'general'

// 根据场景生成增强提示词
const getSceneEnhancedPrompt = (content: string, scene: SceneType): string => {
  const scenePrompts = {
    knowledge: `请用生动有趣的方式介绍这个知识，分板块讲解，创设学习场景，让内容像故事一样吸引人。`,
    guide: `请提供清晰的操作指南，分步骤说明，创设实际使用场景，让用户能轻松跟着做。`,
    compare: `请用对比分析的方式，创设选择场景，帮助用户在具体情境中做出最佳决定。`,
    recommendation: `请基于不同使用场景给出推荐，创设决策情境，让建议更加贴心实用。`,
    technical: `请在技术讲解中创设开发场景，用生动的比喻解释复杂概念，让技术不再枯燥。`,
    creative: `请用启发式的方式回答，创设想象场景，激发用户的创造力和灵感。`,
    analysis: `请用深度解析的方式，创设思考场景，提供多角度的见解和分析。`,
    general: `请用结构化、生动化的方式回答，创设相关使用场景，让内容既专业又有趣。`,
  } as const

  return `${content}\n\n${scenePrompts[scene]}`
}

// 创建Markdown解析器实例
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
        console.error('忽略错误', error)
      }
    }

    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
  },
})

// 定义token类型接口
interface MarkdownToken {
  tag: string
  content: string
  info: string
  type: string
}

// 自定义渲染规则，优化样式
md.renderer.rules.heading_open = (tokens: MarkdownToken[], idx: number) => {
  const token = tokens[idx]
  const level = token.tag.slice(1)

  // 为不同层级标题添加不同样式
  const styleClass = `markdown-h${level}`
  return `<${token.tag} class="markdown-heading ${styleClass}">`
}

md.renderer.rules.paragraph_open = (tokens: MarkdownToken[], idx: number) => {
  const nextToken = tokens[idx + 1]
  if (nextToken && nextToken.type === 'inline') {
    const content = nextToken.content

    // 检测场景描述文本（包含"想象"、"场景"、"比如"等关键词）
    const sceneKeywords = ['想象一下', '比如说', '举个例子', '场景', '情境', '就像']
    if (sceneKeywords.some((keyword) => content.includes(keyword))) {
      return '<p class="scene-description">'
    }

    // 检测强调文本
    if (
      content.includes('**重要**') ||
      content.includes('**注意**') ||
      content.includes('**提示**') ||
      content.includes('**关键**') ||
      content.includes('**核心**')
    ) {
      return '<p class="emphasis-text">'
    }
  }

  return '<p class="markdown-paragraph">'
}

md.renderer.rules.list_item_open = () => {
  return '<li class="markdown-list-item">'
}

// 渲染块级元素时添加场景区块
md.renderer.rules.blockquote_open = () => {
  return '<blockquote class="scene-block tips-block">'
}

// 自定义代码块渲染，添加DeepSeek样式
md.renderer.rules.fence = (tokens: MarkdownToken[], idx: number) => {
  const token = tokens[idx]
  const lang = token.info.trim()
  const codeContent = token.content

  // 使用highlight.js高亮代码
  const highlighted =
    lang && hljs.getLanguage(lang)
      ? hljs.highlight(codeContent, { language: lang, ignoreIllegals: true }).value
      : md.utils.escapeHtml(codeContent)

  // 语言标签
  const langLabel = lang
    ? `<span class="code-language">${lang}</span>`
    : '<span class="code-language">text</span>'

  // 复制按钮
  const copyButton = `<button class="copy-code-button" onclick="copyCodeToClipboard(this)" data-code="${md.utils.escapeHtml(codeContent)}">复制代码</button>`

  return `
    <div class="code-block-wrapper">
      <div class="code-block-header">
        ${langLabel}
        ${copyButton}
      </div>
      <div class="code-block">
        <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
      </div>
    </div>
  `
}

// 行内代码渲染
md.renderer.rules.code_inline = (tokens: MarkdownToken[], idx: number) => {
  const token = tokens[idx]
  return `<code class="inline-code">${md.utils.escapeHtml(token.content)}</code>`
}

export const renderMarkdown = (content: string): string => {
  if (!content) return ''

  // 预处理内容
  const processedContent = content.replace(/\n{3,}/g, '\n\n') // 合并多个空行

  return md.render(processedContent)
}

// 渲染纯文本（安全处理）
export const renderText = (text: string): string => {
  // 将普通文本转换为合适的 HTML，保持自然阅读体验
  return text
    .split('\n')
    .map((line) => {
      const trimmedLine = line.trim()
      if (trimmedLine === '') {
        return '<div class="text-empty-line"><br></div>'
      }

      // 检测是否是列表项
      if (/^[•\-*\d+]\.?\s/.test(trimmedLine)) {
        return `<div class="text-list-item">${trimmedLine}</div>`
      }

      return `<div class="text-paragraph">${trimmedLine}</div>`
    })
    .join('')
}

// 添加复制代码的全局函数类型声明
declare global {
  interface Window {
    copyCodeToClipboard: (button: HTMLElement) => Promise<void>
  }
}

// 复制代码函数
const copyCodeToClipboard = async (button: HTMLElement): Promise<void> => {
  const code = button.getAttribute('data-code')
  if (code) {
    try {
      await navigator.clipboard.writeText(code)

      // 添加复制成功反馈
      button.textContent = '已复制!'
      button.classList.add('copied')

      setTimeout(() => {
        if (button.textContent) {
          button.textContent = '复制代码'
        }
        button.classList.remove('copied')
      }, 2000)
    } catch (error) {
      console.error('复制失败：', error)
    }
  }
}

// 智能内容处理函数
export const smartFormatCorrection = (content: string): string => {
  if (!content) return ''

  // 检测是否误用了代码块
  const lines = content.split('\n')
  let inCodeBlock = false
  let hasRealCode = false
  let textLines = 0
  let codeLines = 0

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      codeLines++
      // 检测是否是真正的代码（包含编程语言特征）
      if (isLikelyCode(line)) {
        hasRealCode = true
      }
    } else {
      textLines++
    }
  }

  // 如果代码块中没有真正的代码，可能是误用
  if (codeLines > 0 && !hasRealCode && textLines < 10) {
    console.log('🔄 检测到可能的代码块误用，进行格式校正')
    // 移除不必要的代码块标记
    return content.replace(/```[a-z]*\n/g, '').replace(/\n```/g, '')
  }

  return content
}

// 辅助函数：检测一行文本是否可能是代码
const isLikelyCode = (line: string): boolean => {
  const codePatterns = [
    /(def|class|function|var|let|const|import|from|export)/, // 编程关键字
    /(={1,3}|>{1,3}|<{1,3}|\+|\-|\*|\/|%|=)/, // 操作符
    /(\(|\)|\[|\]|\{|\})/, // 括号
    /(if|else|for|while|switch|case|return)/, // 控制流
    /(console\.log|print|System\.out\.println)/, // 输出语句
    /(\$|\\|;|=>|->)/, // 特殊符号
  ]

  return codePatterns.some((pattern) => pattern.test(line.trim()))
}

// 修改渲染函数 - 修复逻辑问题
export const renderMessageContent = (content: string): string => {
  if (!content) return ''

  // 先进行智能校正
  const correctedContent = smartFormatCorrection(content)

  // 清理内容中的不必要代码标记
  const cleanedContent = correctedContent
    .replace(/```markdown\s*复制代码\s*/g, '')
    .replace(/```plaintext\s*/g, '')
    .replace(/```\s*$/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // 简化判断逻辑：优先检测是否有真正的Markdown语法
  const hasRealCodeBlocks = /```[a-z]*\n[\s\S]*?\n```/.test(cleanedContent)
  const hasMarkdownSyntax =
    /(^#+ |\*\*.*\*\*|__.*__|\*.*\*|_.*_|`[^`]+`|\[.*\]\(.*\)|^- |\d+\. )/m.test(cleanedContent)
  const hasComplexStructure = cleanedContent.includes('|') && cleanedContent.includes('-')

  console.log('🔍 内容分析:', {
    hasRealCodeBlocks,
    hasMarkdownSyntax,
    hasComplexStructure,
    content: cleanedContent.substring(0, 100) + '...',
  })

  // 如果有任何Markdown语法或复杂结构，使用markdown渲染
  if (hasRealCodeBlocks || hasMarkdownSyntax || hasComplexStructure) {
    console.log('📝 使用Markdown渲染')
    return renderMarkdown(cleanedContent)
  }

  console.log('📄 使用纯文本渲染')
  return renderText(cleanedContent)
}

// 预设回答模板，供AI参考
export const getSceneTemplates = (scene: SceneType): string => {
  const templates = {
    knowledge: `
# [主题名称]

## 📚 知识概览
用生动的比喻或故事引入，创设学习场景...

## 🔍 核心解析
- **关键点1**：详细解释 + 生活举例
- **关键点2**：深度分析 + 实际应用

## 💫 延伸思考
提供更深层的见解和启发...

## 🎯 学习建议
给出实用的学习路径和方法...
`,

    guide: `
# [操作指南]

## 🎯 准备阶段
描述使用场景和准备工作...

## 📝 操作步骤
1. **第一步**：详细说明 + 注意事项
2. **第二步**：操作指导 + 场景举例
3. **第三步**：完成确认 + 效果展示

## 💡 实用技巧
分享提升效率的小技巧...

## ⚠️ 常见问题
列出可能遇到的问题和解决方案...
`,

    compare: `
# [对比分析]

## 🎯 对比背景
创设选择场景，说明为什么需要对比...

## 📊 详细对比
| 特性 | 选项A | 选项B |
|------|-------|-------|
| 特点1 | ... | ... |
| 特点2 | ... | ... |

## 💡 选择建议
基于不同使用场景给出推荐...

## 🚀 使用场景
- **场景1**：适合选项A的情况
- **场景2**：适合选项B的情况
`,
    recommendation: `
# [主题推荐]

## 🎯 推荐背景
创设决策场景，说明推荐的重要性和适用人群...

## 🌟 精选推荐

### 🥇 首选推荐
**推荐项目**：[项目名称]
- **推荐理由**：详细说明为什么这是最佳选择
- **适用场景**：在什么情况下最适合使用
- **核心优势**：突出的特点和好处
- **就像**...用生动的比喻描述其价值

### 🥈 备选方案  
**推荐项目**：[项目名称]
- **推荐理由**：适合特定需求或预算
- **特色亮点**：与众不同的优势
- **适用人群**：最适合哪些用户群体

### 💎 性价比之选
**推荐项目**：[项目名称]
- **价值体现**：如何在有限资源下获得最大价值
- **实用场景**：日常使用中的表现

## 📋 选择指南

### 🎪 不同场景下的选择
- **场景一**：[具体场景描述] → 推荐 [选项]，因为...
- **场景二**：[具体场景描述] → 建议 [选项]，理由是...
- **场景三**：[具体场景描述] → 考虑 [选项]，优势在于...

### 💡 决策要点
1. **首要考虑**：最重要的选择标准
2. **次要因素**：锦上添花的特性
3. **避坑提示**：需要避免的常见误区

## 🚀 使用建议
给出具体的实施步骤和使用技巧，让推荐落地可行...
`,
    technical: `
# [技术主题]

## 🔧 技术概览
用生动的技术比喻解释复杂概念...

## 💻 实现方案
提供具体的技术实现方法和代码示例...

## 🛠️ 最佳实践
分享行业内的最佳实践和经验总结...
`,
    creative: `
# [创意主题]

## 💫 灵感来源
创设创意场景，激发想象力...

## 🎨 创意方案
提供多个创意方向和实施思路...

## 🌈 实现路径
给出将创意落地的具体方法和步骤...
`,

    analysis: `
# [分析主题]

## 🔬 分析框架
建立清晰的分析维度和标准...

## 📈 深度解析
从多个角度进行深入分析和解读...

## 💡 洞察发现
提炼核心洞察和关键发现...
`,
    general: `
# [主题名称]

## 📌 核心概览
用生动的语言概括主题核心...

## 🎯 主要内容
分板块详细介绍各个方面...

## 💡 实用价值
强调内容的实际应用价值...

## 🌟 总结展望
总结要点并展望未来发展...
`,
  }

  return templates[scene] || templates.knowledge
}

// 将函数挂载到全局
if (typeof window !== 'undefined') {
  window.copyCodeToClipboard = copyCodeToClipboard
}

export { detectContentScene, getSceneEnhancedPrompt }
export type { SceneType }

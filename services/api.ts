import axios from 'axios'

// 智谱AI API 配置
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const API_KEY = import.meta.env.VITE_ZHIPU_API_KEY

// 检查 API 密钥是否配置
if (!API_KEY) {
  console.warn('请设置VITE_ZHIPU_API_KEY环境变量')
}

// 创建 axios 实例，配置基础请求参数
const apiClient = axios.create({
  baseURL: ZHIPU_API_URL,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  },
})
// 定义消息类型（根据智谱AI API文档）
export interface ApiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// 定义API请求参数
interface ChatCompletionRequest {
  model: string
  messages: ApiMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

// 定义API响应类型
interface ChatCompletionResponse {
  id: string
  request_id: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
  }>
}

// 用于中止流式请求的控制器
let abortController: AbortController | null = null
/**
 * 流式AI对话函数
 * @param userMessage 用户消息
 * @param onMessage 接收流式消息的回调函数
 * @param onComplete 流式输出完成的回调函数
 * @param onError 错误处理回调函数
 */
// api.ts - 优化系统提示词
// 在 api.ts 或专门的提示词文件中
export const getStructuredSystemPrompt = () => {
  return `你是一个专业、生动、有条理的AI助手。请按照以下结构化格式回答问题：

## 回答格式要求

### 1. 标题层级结构
- 使用 # 作为主标题（一级标题）
- 使用 ## 作为板块标题（二级标题）  
- 使用 ### 作为子板块标题（三级标题）
- 合理使用标题层级，让内容层次清晰

### 2. 内容板块划分
每个回答应该分为3-5个逻辑板块，例如：
- 📌 核心概览
- 🎯 主要特点  
- 💡 实用信息
- 🌟 深度解析
- 📝 总结建议

### 3. 场景化描述技巧
- **使用生动比喻**：如"就像...一样"
- **创设使用场景**：描述在什么情况下会用到
- **情感化表达**：适当使用emoji和感叹词
- **具体案例**：给出真实可感的例子

### 4. 视觉元素使用
- 合理使用 **粗体**、*斜体* 强调重点
- 使用列表展示多项内容
- 适当分隔不同板块
- 使用表格对比信息

### 5. 回答结构模板

【主标题】# 主题名称

【板块一】## 📌 核心概览
用1-2句话生动概括核心内容，创设使用场景。

【板块二】## 🎯 主要特点
- **特点1**：详细描述 + 场景举例
- **特点2**：详细描述 + 使用价值
- **特点3**：详细描述 + 对比说明

【板块三】## 💡 实用信息
具体的使用方法、步骤或注意事项。

【板块四】## 🌟 深度解析
深入分析原理、背景或进阶知识。

【板块五】## 📝 总结建议
给出实用建议或行动指南。

## 生动性要求
1. 避免干巴巴的罗列，要像朋友聊天一样自然
2. 多用"你可能会..."、"想象一下..."等互动句式
3. 适当使用emoji增加亲和力（但不要过度）
4. 创设具体的使用场景和用户故事

记住：好的回答 = 清晰结构 + 生动表达 + 实用价值！`
}
export const chatWithAIStream = async (
  userMessage: string,
  onMessage: (content: string) => void,
  onComplete: () => void,
  onError: (error: string) => void,
): Promise<void> => {
  // 创建新的中止控制器
  abortController = new AbortController()

  try {
    // 构建请求数据
    const requestData: ChatCompletionRequest = {
      model: 'glm-4', // 使用智谱AI的GLM-4模型
      messages: [
        {
          role: 'system',
          content: getStructuredSystemPrompt(),
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.7, // 控制回答的随机性
      stream: true, // 开启流式输出
      max_tokens: 2048, // 最大输出长度
    }
    // 发送流式请求
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestData),
      signal: abortController.signal, // 支持请求中止
    })

    // 检查响应状态
    if (!response.ok) {
      throw new Error(`HTTP error!status :${response.status}`)
    }
    if (!response.body) {
      throw new Error('Response body is null')
    }

    // 创建流式读取器
    const reader = response.body.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    let accumulatedContent = ''

    // 循环读取流式数据
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        onComplete()
        break
      }

      // 解码数据块
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      // 处理每一行数据
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine === 'data: [DONE]') {
          continue
        }
        if (trimmedLine.startsWith('data:')) {
          try {
            const jsonStr = trimmedLine.slice(5).trim() // 去掉'data:'前缀
            if (jsonStr && jsonStr !== '[DONE]') {
              const data = JSON.parse(jsonStr)
              if (data.choices && data.choices[0]) {
                const delta = data.choices[0].delta
                if (delta && delta.content) {
                  const content = delta.content
                  accumulatedContent += content
                  onMessage(accumulatedContent) // 实时更新内容
                }
              }
            }
          } catch (e) {
            console.warn('解析流数据失败：', e, '原始数据', trimmedLine)
          }
        }
      }
    }
  } catch (error: unknown) {
    console.error('流式API调用失败：', error)
    let errorMessage = '流式请求失败'
    if (error instanceof Error) {
      errorMessage = error.message
      onComplete()
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    onError(errorMessage)
  }
}

/**
 * 中止流式请求
 */
export const abortStreaming = () => {
  if (abortController) {
    console.log('🚫 中止流式请求')
    abortController.abort()
  }
}
/**
 * 非流式AI对话函数（备用方法）
 * @param userMessage 用户消息
 * @returns Promise<string> AI回复内容
 */
export const chatWithAI = async (userMessage: string): Promise<string> => {
  try {
    const requestData: ChatCompletionRequest = {
      model: 'glm-4', //使用GLM-4模型
      messages: [
        {
          role: 'system',
          content: `你是一个专业的编程助手。当返回代码时，请严格遵守以下格式要求：
            1. 代码必须用Markdown代码块包裹：
            \`\`\`语言名称
            代码内容
            \`\`\`
            2. 代码缩进必须使用4个空格，不要使用制表符
            3. 确保代码语法正确且可运行
            4. 在代码前后提供必要的解释
            例如：
            我们可以用Python实现斐波那契数列：
            \`\`\`python
            def fibonacci(n):
                if n <= 1:
                    return n
                else:
                    return fibonacci(n-1) + fibonacci(n-2)
            \`\`\`
            这个递归版本简单但效率较低。`,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.7,
      stream: false,
    }
    console.log('发送API请求', requestData)
    const response = await apiClient.post<ChatCompletionResponse>('', requestData)
    console.log('API响应：', response.data)
    if (response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content
    } else {
      throw new Error('AI返回数据格式错误:choices为空')
    }
  } catch (error: unknown) {
    console.error('API调用失败：', error)
    // 更详细的错误处理
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // 服务器返回错误状态码
        console.error('错误状态', error.response.status)
        console.error('错误状态', error.response.data)
        throw new Error(
          `AI服务失败:${error.response.status}-${JSON.stringify(error.response.data)}`,
        )
      } else if (error.request) {
        // 请求发送失败
        throw new Error('网络错误：无法连接到AI服务')
      } else {
        // 其他错误
        throw new Error(`AI服务调用失败：${error.message}`)
      }
    }
    // 非Axios错误
    throw new Error('未知错误：AI服务调用失败')
  }
}

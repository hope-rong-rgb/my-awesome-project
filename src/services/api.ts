import axios from 'axios'

// 智谱AI API 配置
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const API_KEY = import.meta.env.VITE_ZHIPU_API_KEY

// 检查 API 密钥
if (!API_KEY) {
  console.warn('⚠️ 请设置VITE_ZHIPU_API_KEY环境变量')
}

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: ZHIPU_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  },
})

// 类型定义
export interface ApiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionRequest {
  model: string
  messages: ApiMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

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

// 中止控制器
let abortController: AbortController | null = null

/**
 * 优化的系统提示词
 */
const getSystemPrompt = (): string => {
  return `你是一个专业、友好的AI助手。请遵循以下回答原则:

## 回答结构
1. **清晰的层次**: 使用标题(#, ##, ###)组织内容
2. **突出重点**: 使用**粗体**和*斜体*强调关键信息
3. **列表展示**: 用列表呈现多个要点
4. **代码规范**: 代码块必须指定语言,并确保格式正确

## 内容风格
- 专业准确,同时保持亲和力
- 解释清楚,避免过于复杂的术语
- 提供实用的建议和例子
- 适当使用emoji增加可读性(但不要过度)

## 代码要求
当提供代码时:
- 必须使用正确的Markdown代码块格式
- 指定准确的编程语言
- 代码要完整、可运行
- 添加必要的注释说明

记住:好的回答 = 清晰结构 + 准确内容 + 实用价值`
}

/**
 * 流式AI对话函数
 */
export const chatWithAIStream = async (
  userMessage: string,
  onMessage: (content: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> => {
  // 创建新的中止控制器
  abortController = new AbortController()

  try {
    // 构建请求数据
    const requestData: ChatCompletionRequest = {
      model: 'glm-4',
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(),
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.7,
      stream: true,
      max_tokens: 4096,
    }

    // 发送流式请求
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestData),
      signal: abortController.signal,
    })

    // 检查响应状态
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API错误 ${response.status}: ${errorText}`)
    }

    if (!response.body) {
      throw new Error('响应体为空')
    }

    // 创建流式读取器
    const reader = response.body.getReader()
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
        
        // 跳过空行和结束标记
        if (!trimmedLine || trimmedLine === 'data: [DONE]') {
          continue
        }

        // 解析数据
        if (trimmedLine.startsWith('data:')) {
          try {
            const jsonStr = trimmedLine.slice(5).trim()
            if (jsonStr && jsonStr !== '[DONE]') {
              const data = JSON.parse(jsonStr)
              
              // 提取内容
              if (data.choices?.[0]?.delta?.content) {
                const content = data.choices[0].delta.content
                accumulatedContent += content
                onMessage(accumulatedContent)
              }
            }
          } catch (e) {
            console.warn('解析流数据失败:', e, '原始数据:', trimmedLine)
          }
        }
      }
    }
  } catch (error: unknown) {
    // 判断是否是用户主动中止
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('🛑 请求已被用户中止')
      return
    }

    console.error('❌ 流式API调用失败:', error)
    
    let errorMessage = '请求失败,请稍后重试'
    if (error instanceof Error) {
      errorMessage = error.message
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
    abortController = null
  }
}

/**
 * 非流式AI对话函数(备用)
 */
export const chatWithAI = async (userMessage: string): Promise<string> => {
  try {
    const requestData: ChatCompletionRequest = {
      model: 'glm-4',
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(),
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.7,
      stream: false,
    }

    const response = await apiClient.post<ChatCompletionResponse>('', requestData)

    if (response.data.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content
    } else {
      throw new Error('AI返回数据格式错误')
    }
  } catch (error: unknown) {
    console.error('❌ API调用失败:', error)

    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`AI服务失败: ${error.response.status}`)
      } else if (error.request) {
        throw new Error('网络错误: 无法连接到AI服务')
      }
    }
    throw new Error('未知错误: AI服务调用失败')
  }
}
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatWithAIStream, abortStreaming } from '@/services/api'

// 消息类型定义
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// 聊天会话类型定义
export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

// 请求状态枚举
enum RequestState {
  IDLE = 'idle',
  LOADING = 'loading',
  STREAMING = 'streaming',
}

export const useChatStore = defineStore(
  'chat',
  () => {
    // ========== 状态定义 ==========
    const sessions = ref<ChatSession[]>([])
    const currentSessionId = ref<string | null>(null)
    const requestState = ref<RequestState>(RequestState.IDLE)
    const streamingContent = ref('')
    const currentStreamingMessageId = ref<string | null>(null)

    // ========== 计算属性 ==========
    const isLoading = computed(() => requestState.value === RequestState.LOADING)
    const isStreaming = computed(() => requestState.value === RequestState.STREAMING)

    const currentSession = computed(() => {
      return sessions.value.find((session) => session.id === currentSessionId.value)
    })

    const currentMessages = computed(() => {
      const messages = currentSession.value?.messages || []
      return [...messages].sort((a, b) => a.timestamp - b.timestamp)
    })

    const isCurrentSessionEmpty = computed(() => {
      const current = currentSession.value
      return !current || !current.messages || current.messages.length === 0
    })

    // ========== 工具函数 ==========
    const generateUniqueId = (): string => {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    const generateSessionId = (): string => {
      return `session-${generateUniqueId()}`
    }

    const generateMessageId = (): string => {
      return `msg-${generateUniqueId()}`
    }

    // 统一的状态重置函数
    const resetRequestState = () => {
      requestState.value = RequestState.IDLE
      streamingContent.value = ''
      currentStreamingMessageId.value = null
    }

    // 更新会话时间
    const updateSessionTime = (sessionId: string) => {
      const session = sessions.value.find((s) => s.id === sessionId)
      if (session) {
        session.updatedAt = Date.now()
      }
    }

    // ========== 会话管理 ==========
    const initializeSessions = () => {
      if (sessions.value.length === 0) {
        createNewSession()
      } else if (!currentSessionId.value) {
        currentSessionId.value = sessions.value[0].id
      }
      console.log('✅ 会话初始化完成:', {
        sessionCount: sessions.value.length,
        currentSessionId: currentSessionId.value,
      })
    }

    const createNewSession = (): string => {
      // 检查当前会话是否为空
      if (isCurrentSessionEmpty.value && sessions.value.length > 0) {
        window.$message?.warning('当前会话为空,请先发送消息后再创建新对话')
        return currentSessionId.value || ''
      }

      const newSession: ChatSession = {
        id: generateSessionId(),
        title: '新对话',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      sessions.value.unshift(newSession)
      currentSessionId.value = newSession.id
      console.log('🆕 创建新会话:', newSession.id)
      return newSession.id
    }

    const switchSession = (sessionId: string) => {
      if (requestState.value !== RequestState.IDLE) {
        window.$message?.warning('请等待当前消息处理完成')
        return
      }
      currentSessionId.value = sessionId
    }

    const deleteSession = (sessionId: string) => {
      const index = sessions.value.findIndex((s) => s.id === sessionId)
      if (index !== -1) {
        sessions.value.splice(index, 1)
        if (currentSessionId.value === sessionId) {
          currentSessionId.value = sessions.value[0]?.id || null
          if (!currentSessionId.value) {
            createNewSession()
          }
        }
        window.$message?.success('已删除对话')
      }
    }

    const renameSession = (sessionId: string, newTitle: string) => {
      const session = sessions.value.find((s) => s.id === sessionId)
      if (session) {
        session.title = newTitle.trim() || '未命名对话'
        updateSessionTime(sessionId)
      }
    }

    // ========== 消息处理 ==========
    const sendUserMessage = async (content: string) => {
      const trimmedContent = content.trim()
      if (!trimmedContent) {
        console.warn('❌ 消息内容为空')
        return
      }

      // 防止重复请求
      if (requestState.value !== RequestState.IDLE) {
        console.warn('🚫 已有请求在进行中')
        return
      }

      console.log('📤 发送用户消息:', trimmedContent)

      // 确保有当前会话
      if (!currentSessionId.value || sessions.value.length === 0) {
        createNewSession()
      }

      const session = currentSession.value
      if (!session) {
        console.error('❌ 找不到当前会话')
        return
      }

      // 创建用户消息
      const userMessage: Message = {
        id: generateMessageId(),
        role: 'user',
        content: trimmedContent,
        timestamp: Date.now(),
      }

      session.messages.push(userMessage)
      updateSessionTime(session.id)

      // 更新会话标题(仅首条消息)
      if (session.messages.length === 1) {
        session.title = trimmedContent.slice(0, 20) + (trimmedContent.length > 20 ? '...' : '')
      }

      // 调用AI
      await callAIStream(session.id, trimmedContent)
    }

    const regenerateFromMessage = async (messageId: string) => {
      if (requestState.value !== RequestState.IDLE) {
        window.$message?.warning('请等待当前消息处理完成')
        return
      }

      const session = currentSession.value
      if (!session) {
        console.error('❌ 找不到当前会话')
        return
      }

      const targetIndex = session.messages.findIndex((msg) => msg.id === messageId)
      if (targetIndex === -1) {
        console.error('❌ 找不到指定消息')
        return
      }

      const targetMessage = session.messages[targetIndex]

      // 删除该消息之后的所有消息
      session.messages = session.messages.slice(0, targetIndex + 1)
      updateSessionTime(session.id)

      // 获取用户消息内容
      let userContent = ''
      if (targetMessage.role === 'user') {
        userContent = targetMessage.content
      } else if (targetMessage.role === 'assistant') {
        // 删除当前AI消息
        session.messages.pop()
        // 找到上一条用户消息
        const previousUserMessage = session.messages
          .slice()
          .reverse()
          .find((msg) => msg.role === 'user')
        if (previousUserMessage) {
          userContent = previousUserMessage.content
        }
      }

      if (userContent) {
        await callAIStream(session.id, userContent)
      }
    }

    const callAIStream = async (sessionId: string, userContent: string) => {
      requestState.value = RequestState.LOADING
      streamingContent.value = ''

      const session = sessions.value.find((s) => s.id === sessionId)
      if (!session) {
        console.error('❌ 找不到会话:', sessionId)
        resetRequestState()
        return
      }

      try {
        // 创建AI消息
        const aiMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        }

        currentStreamingMessageId.value = aiMessage.id
        session.messages.push(aiMessage)
        updateSessionTime(session.id)

        console.log('🤖 开始AI调用, 消息ID:', aiMessage.id)

        // 切换到流式状态
        requestState.value = RequestState.STREAMING

        await chatWithAIStream(
          userContent,
          (content) => {
            // 实时更新内容
            if (requestState.value !== RequestState.STREAMING) return

            streamingContent.value = content
            const messageIndex = session.messages.findIndex((msg) => msg.id === aiMessage.id)
            if (messageIndex !== -1) {
              session.messages[messageIndex].content = content
              updateSessionTime(session.id)
            }
          },
          () => {
            // 完成回调
            if (requestState.value !== RequestState.STREAMING) return
            console.log('✅ 流式输出完成')
            updateSessionTime(session.id)
            resetRequestState()
          },
          (error) => {
            // 错误回调
            if (requestState.value !== RequestState.STREAMING) return
            console.error('❌ 流式输出错误:', error)

            const messageIndex = session.messages.findIndex((msg) => msg.id === aiMessage.id)
            if (messageIndex !== -1) {
              session.messages[messageIndex].content = `抱歉,AI回复过程中出现错误: ${error}`
              updateSessionTime(session.id)
            }
            resetRequestState()
            window.$message?.error('AI回复失败,请重试')
          }
        )
      } catch (error) {
        console.error('💥 调用AI时发生错误:', error)
        resetRequestState()
        window.$message?.error('发送消息失败,请重试')
      }
    }

    const stopStreaming = () => {
      console.log('🛑 停止流式输出')
      abortStreaming()
      resetRequestState()
      window.$message?.info('已停止生成')
    }

    // ========== 数据导入导出 ==========
    const clearCurrentSession = () => {
      const session = currentSession.value
      if (session) {
        session.messages = []
        session.title = '新对话'
        updateSessionTime(session.id)
      }
    }

    const exportSession = (sessionId: string): string => {
      const session = sessions.value.find((s) => s.id === sessionId)
      return session ? JSON.stringify(session, null, 2) : ''
    }

    const importSession = (data: string): boolean => {
      try {
        const sessionData: ChatSession = JSON.parse(data)
        if (sessionData.id && sessionData.messages) {
          // 避免ID冲突
          if (sessions.value.some((s) => s.id === sessionData.id)) {
            sessionData.id = generateSessionId()
          }
          if (!sessionData.updatedAt) {
            sessionData.updatedAt = sessionData.createdAt || Date.now()
          }
          sessions.value.unshift(sessionData)
          window.$message?.success('导入会话成功')
          return true
        }
      } catch (error) {
        console.error('导入会话失败:', error)
        window.$message?.error('导入会话失败,数据格式错误')
      }
      return false
    }

    // 初始化
    initializeSessions()

    return {
      // 状态
      sessions,
      currentSessionId,
      isLoading,
      isStreaming,
      streamingContent,
      currentStreamingMessageId,

      // 计算属性
      currentMessages,
      currentSession,
      isCurrentSessionEmpty,

      // 方法
      createNewSession,
      switchSession,
      sendUserMessage,
      deleteSession,
      stopStreaming,
      renameSession,
      clearCurrentSession,
      exportSession,
      importSession,
      initializeSessions,
      regenerateFromMessage,
    }
  },
  {
    persist: true,
  }
)
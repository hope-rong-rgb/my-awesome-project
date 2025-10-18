/**
 * 聊天状态管理 Store
 * 负责管理聊天会话、消息、流式输出等功能
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatWithAIStream } from '@/services/api'

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

export const useChatStore = defineStore(
  'chat',
  () => {
    // ========== 状态定义 ==========
    const sessions = ref<ChatSession[]>([]) // 所有聊天会话
    const currentSessionId = ref<string | null>(null) // 当前会话ID
    const isLoading = ref(false) // 加载状态

    // 流式输出相关状态
    const streamingContent = ref('') // 流式内容
    const isStreaming = ref(false) // 是否正在流式输出
    const currentStreamingMessageId = ref<string | null>(null) // 当前流式消息ID

    // ========== 工具函数 ==========
    /**
     * 生成唯一消息ID
     */
    const generateUniqueId = (): string => {
      return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * 生成唯一会话ID
     */
    const generateSessionId = (): string => {
      return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    // ========== 计算属性 ==========
    /**
     * 当前会话
     */
    const currentSession = computed(() => {
      return sessions.value.find((session) => session.id === currentSessionId.value)
    })

    /**
     * 当前会话的消息列表（按时间排序）
     */
    const currentMessages = computed(() => {
      const messages = currentSession.value?.messages || []
      return messages.sort((a, b) => a.timestamp - b.timestamp)
    })

    // ========== 会话管理 ==========
    /**
     * 初始化会话
     */
    const initializeSessions = () => {
      if (sessions.value.length === 0) {
        createNewSession()
      } else if (!currentSessionId.value) {
        currentSessionId.value = sessions.value[0].id
      }
      console.log('🔍 初始化会话检查:', {
        sessionCount: sessions.value.length,
        currentSessionId: currentSessionId.value,
        currentMessages: currentSession.value?.messages || [],
      })
    }

    /**
     * 创建新会话
     */
    const createNewSession = (): string => {
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

    /**
     * 切换会话
     */
    const switchSession = (sessionId: string) => {
      currentSessionId.value = sessionId
    }

    // 发送用户消息

    const sendUserMessage = async (content: string) => {
      // 严格的内容检查
      if (!content || !content.trim()) {
        console.warn('❌ 发送空消息被阻止')
        return
      }

      console.log('📤 发送用户消息:', { content: content.trim() })

      if (!currentSessionId.value || sessions.value.length === 0) {
        createNewSession()
      }

      const userMessage: Message = {
        id: generateUniqueId(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      }

      const session = sessions.value.find((s) => s.id === currentSessionId.value)
      if (session) {
        session.messages.push(userMessage)
        session.updatedAt = Date.now()

        if (session.messages.length === 1) {
          session.title = content.trim().slice(0, 20) + (content.length > 20 ? '...' : '')
        }
      }

      await callRealAIStream()
    }

    // 新增：从指定消息重新生成
    const regenerateFromMessage = async (messageId: string) => {
      if (isStreaming.value || isLoading.value) return

      const session = sessions.value.find((s) => s.id === currentSessionId.value)
      if (!session) {
        console.error('找不到当前会话')
        return
      }

      // 找到要重新生成的消息
      const targetMessageIndex = session.messages.findIndex((msg) => msg.id === messageId)
      if (targetMessageIndex === -1) {
        console.error('找不到指定消息')
        return
      }

      const targetMessage = session.messages[targetMessageIndex]

      // 删除该消息之后的所有消息
      session.messages = session.messages.slice(0, targetMessageIndex + 1)
      session.updatedAt = Date.now()

      // 根据消息类型决定如何重新生成
      if (targetMessage.role === 'user') {
        // 如果是用户消息，重新调用AI
        await callRealAIStream()
      } else if (targetMessage.role === 'assistant') {
        // 如果是AI消息，找到对应的用户消息重新生成
        const previousUserMessage = session.messages
          .slice(0, targetMessageIndex)
          .reverse()
          .find((msg) => msg.role === 'user')

        if (previousUserMessage) {
          await callRealAIStream()
        }
      }
    }

    // 流式AI调用函数
    // 修改 callRealAIStream 方法
    const callRealAIStream = async () => {
      // 添加请求锁检查，防止重复调用
      if (isLoading.value || isStreaming.value) {
        console.warn('🚫 已有请求在进行中，忽略重复调用')
        return
      }

      isLoading.value = true
      isStreaming.value = true
      streamingContent.value = ''

      const session = sessions.value.find((s) => s.id === currentSessionId.value)
      if (!session) {
        console.error('❌ 找不到当前会话')
        // 使用统一的状态重置函数
        resetRequestState()
        return
      }

      try {
        // 获取最后一条用户消息内容
        const lastUserMessage = session.messages.filter((msg) => msg.role === 'user').pop()
        if (!lastUserMessage) {
          throw new Error('没有找到用户消息')
        }

        // 创建一条空的AI消息
        const aiMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        }

        currentStreamingMessageId.value = aiMessage.id
        session.messages.push(aiMessage)
        session.updatedAt = Date.now()

        console.log('🤖 开始 AI 调用，消息ID:', aiMessage.id)

        // 调用流式API
        await chatWithAIStream(
          lastUserMessage.content,
          (content) => {
            // 检查是否已被中止
            if (!isStreaming.value) {
              console.log('🛑 流式输出已被中止，停止接收数据')
              return
            }
            streamingContent.value = content
            const messageIndex = session.messages.findIndex((msg) => msg.id === aiMessage.id)
            if (messageIndex !== -1) {
              session.messages[messageIndex].content = content
              session.updatedAt = Date.now()
            }
          },
          () => {
            // 检查是否已被中止
            if (!isStreaming.value) {
              console.log('🛑 流式输出完成回调被跳过（已中止）')
              return
            }
            console.log('✅ 流式输出正常完成')
            // ✅ 修复：在完成回调中重置所有状态
            resetRequestState()
            session.updatedAt = Date.now()
          },
          (error) => {
            // 检查是否已被中止
            if (!isStreaming.value) {
              console.log('🛑 流式输出错误回调被跳过（已中止）')
              return
            }
            console.error('❌ 流式输出错误：', error)

            const messageIndex = session.messages.findIndex((msg) => msg.id === aiMessage.id)
            if (messageIndex !== -1) {
              session.messages[messageIndex].content = `抱歉，AI回复过程中出现错误：${error}`
              session.updatedAt = Date.now()
            }
            // ✅ 修复：在错误回调中重置所有状态
            resetRequestState()
          },
        )
      } catch (error) {
        // 检查是否已被中止
        if (!isStreaming.value) {
          console.log('🛑 主流程错误被跳过（已中止）')
          return
        }
        console.error('💥 出现错误', error)
        // ✅ 修复：在 catch 块中重置所有状态
        resetRequestState()
      } finally {
        // ✅ 修复：finally 中确保状态被重置（安全网）
        // 即使前面的回调没有正确执行，这里也能保证状态被清理
        if (isLoading.value || isStreaming.value) {
          console.warn('🛡️  finally 块中检测到未重置的状态，执行清理')
          resetRequestState()
        }
      }
    }

    // 添加统一的状态重置函数
    const resetRequestState = () => {
      console.log('🔄 重置请求状态')
      isLoading.value = false
      isStreaming.value = false
      streamingContent.value = ''
      currentStreamingMessageId.value = null
    }

    // 停止流式输出
    const stopStreaming = () => {
      console.log('🛑 执行 stopStreaming')
      resetRequestState()
    }

    // 删除会话
    const deleteSession = (sessionId: string) => {
      const index = sessions.value.findIndex((s) => s.id === sessionId)
      if (index !== -1) {
        sessions.value.splice(index, 1)
        if (currentSessionId.value === sessionId) {
          currentSessionId.value = sessions.value[0]?.id || null
        }
      }
    }

    // 重命名会话
    const renameSession = (sessionId: string, newTitle: string) => {
      const session = sessions.value.find((s) => s.id === sessionId)
      if (session) {
        session.title = newTitle.trim() || '未命名对话'
        session.updatedAt = Date.now()
      }
    }

    // 清空当前会话消息
    const clearCurrentSession = () => {
      const session = sessions.value.find((s) => s.id === currentSessionId.value)
      if (session) {
        session.messages = []
        session.title = '新对话'
        session.updatedAt = Date.now()
      }
    }

    // 导出会话数据
    const exportSession = (sessionId: string): string => {
      const session = sessions.value.find((s) => s.id === sessionId)
      return session ? JSON.stringify(session, null, 2) : ''
    }

    // 导入会话数据
    const importSession = (data: string): boolean => {
      try {
        const sessionData: ChatSession = JSON.parse(data)
        if (sessionData.id && sessionData.messages) {
          if (sessions.value.some((s) => s.id === sessionData.id)) {
            sessionData.id = generateSessionId()
          }

          if (!sessionData.updatedAt) {
            sessionData.updatedAt = sessionData.createdAt || Date.now()
          }

          sessions.value.unshift(sessionData)
          return true
        }
      } catch (error) {
        console.error('导入会话失败:', error)
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
      streamingContent,
      isStreaming,
      currentStreamingMessageId,

      // 计算属性
      currentMessages,
      currentSession,

      // 动作
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
      regenerateFromMessage, // 新增的重发方法
    }
  },
  {
    persist: true,
  },
)

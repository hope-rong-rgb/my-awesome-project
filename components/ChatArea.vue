<!-- 右侧聊天区域 -->
<template>
  <div class="chat-container">
    <!-- 消息展示区 -->
    <div class="messages-area">
      <!-- 滚动到底部按钮 -->
      <transition name="fade">
        <div v-if="!autoScrollEnabled && currentMessages.length > 0" class="scroll-to-bottom">
          <n-tooltip placement="left">
            <template #trigger>
              <n-button circle size="small" @click="scrollToTopAndEnable" class="scroll-btn">
                <template #icon>
                  <n-icon><ArrowUpIcon /></n-icon>
                </template>
              </n-button>
            </template>
            回到顶部
          </n-tooltip>
        </div>
      </transition>
      <n-scrollbar ref="scrollbarRef" @scroll="handleScroll" style="height: 100%">
        <div ref="scrollContentRef" class="messages-container reverse-layout-container">
          <div class="scroll-anchor"></div>
          <div class="messages-list">
            <!-- 消息列表 -->
            <div
              v-for="message in currentMessages"
              :key="message.id"
              :class="{
                'message-item': true,
                'message-user': message.role === 'user',
                'message-assistant': message.role === 'assistant',
              }"
            >
              <!-- 用户消息 -->
              <div v-if="message.role === 'user'" class="user-message">
                <div class="message-avatar">
                  <n-avatar round size="small" class="avatar-user"> 你 </n-avatar>
                </div>
                <div class="message-content-wrapper">
                  <div class="message-header">
                    <span class="message-sender">你</span>
                    <!-- 用户消息的重发按钮 -->
                    <n-button
                      v-if="showRegenerateButton(message)"
                      text
                      size="tiny"
                      @click="handleRegenerate(message)"
                      :disabled="isRegenerateDisabled"
                      class="regenerate-btn"
                      title="重新生成"
                    >
                      <template #icon>
                        <n-icon size="14"><RefreshIcon /></n-icon>
                      </template>
                      重新生成
                    </n-button>
                  </div>
                  <div class="message-bubble user-bubble">
                    <div class="message-text" v-html="renderMessageContent(message.content)"></div>
                  </div>
                  <div class="message-time">
                    {{ formatTime(message.timestamp) }}
                  </div>
                </div>
              </div>

              <!-- AI消息 -->
              <div v-else class="assistant-message">
                <div class="message-avatar">
                  <n-avatar round size="small" class="avatar-assistant"> AI </n-avatar>
                </div>
                <div class="message-content-wrapper">
                  <div class="message-header">
                    <span class="message-sender">AI助手</span>
                    <div class="message-actions">
                      <!-- AI消息的复制按钮 -->
                      <n-button
                        text
                        size="tiny"
                        @click="copyCode(message.content)"
                        class="copy-btn"
                        title="复制内容"
                      >
                        <template #icon>
                          <n-icon size="14"><CopyIcon /></n-icon>
                        </template>
                      </n-button>
                      <!-- AI消息的重发按钮 -->
                      <n-button
                        v-if="showRegenerateButton(message)"
                        text
                        size="tiny"
                        @click="handleRegenerate(message)"
                        :disabled="isRegenerateDisabled"
                        class="regenerate-btn"
                        title="重新生成"
                      >
                        <template #icon>
                          <n-icon size="14"><RefreshIcon /></n-icon>
                        </template>
                      </n-button>
                    </div>
                  </div>
                  <div class="message-bubble assistant-bubble">
                    <!-- 流式输出效果 -->
                    <div
                      v-if="isStreaming && message.id === currentStreamingMessageId"
                      class="streaming-content"
                    >
                      <span v-html="renderMessageContent(message.content)"></span>
                      <span class="typing-cursor">|</span>
                    </div>
                    <div v-else class="static-content">
                      <span v-html="renderMessageContent(message.content)"></span>
                    </div>
                  </div>
                  <div class="message-time">
                    {{ formatTime(message.timestamp) }}
                    <span
                      v-if="isStreaming && message.id === currentStreamingMessageId"
                      class="streaming-indicator"
                    >
                      · 正在输入
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 加载状态 -->
            <div v-if="isLoading && !isStreaming" class="message-item message-assistant">
              <div class="assistant-message">
                <div class="message-avatar">
                  <n-avatar round size="small" class="avatar-assistant"> AI </n-avatar>
                </div>
                <div class="message-content-wrapper">
                  <div class="loading-indicator">
                    <n-spin size="small" />
                    <span>AI正在思考...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </n-scrollbar>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-container">
        <n-input
          v-model:value="userInput"
          type="textarea"
          placeholder="输入你的问题..."
          :autosize="{
            minRows: 1,
            maxRows: 4,
          }"
          @keydown="handleKeydown"
          :disabled="isStreaming"
          class="message-input"
        />
        <div class="input-actions">
          <!-- 停止生成按钮 -->
          <n-button
            v-if="isStreaming"
            type="warning"
            @click="handleStop"
            size="small"
            class="stop-btn"
          >
            <template #icon>
              <n-icon><StopIcon /></n-icon>
            </template>
            停止生成
          </n-button>
          <n-button
            type="primary"
            @click="handleSend"
            :loading="isLoading && !isStreaming"
            :disabled="!userInput.trim() || isStreaming"
            class="send-btn"
          >
            <template #icon>
              <n-icon><SendIcon /></n-icon>
            </template>
            发送
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { NAvatar, NButton, NIcon, NInput, NScrollbar, NSpin, NTooltip } from 'naive-ui'
import {
  SendOutline as SendIcon,
  StopOutline as StopIcon,
  CopyOutline as CopyIcon,
  ArrowUpOutline as ArrowUpIcon,
  RefreshOutline as RefreshIcon,
} from '@vicons/ionicons5'
import { ref, nextTick, onMounted, watch, onUnmounted, computed } from 'vue'
import { useChatStore, type Message } from '@/stores/chat'
import { storeToRefs } from 'pinia'
import { renderMessageContent as smartRenderMessageContent } from '@/utils/markdown'
import { detectContentScene, getSceneEnhancedPrompt } from '@/utils/markdown'
// 定义 NScrollbar 组件的类型接口
interface ScrollbarExposed {
  containerRef: HTMLElement | null
  scrollTo: (options: { top?: number; left?: number; behavior?: 'auto' | 'smooth' }) => void
}

const chatStore = useChatStore()
const { currentMessages, isLoading, isStreaming, currentStreamingMessageId } =
  storeToRefs(chatStore)
const userInput = ref('')
const scrollbarRef = ref<InstanceType<typeof NScrollbar> & ScrollbarExposed>()
const autoScrollEnabled = ref(true)
// 获取滚动容器
const getScrollContainer = (): HTMLElement | null => {
  if (!scrollbarRef.value) {
    return null
  }

  try {
    // 方法1: 直接使用 naive-ui 提供的 containerRef
    if (scrollbarRef.value.containerRef) {
      return scrollbarRef.value.containerRef
    }

    // 方法2: 尝试通过DOM查找
    const scrollContainers = [
      '.n-scrollbar-container',
      '.n-scrollbar-content-wrapper',
      '.n-scrollbar-content',
    ]

    for (const selector of scrollContainers) {
      const element = document.querySelector(selector) as HTMLElement
      if (element) {
        return element
      }
    }
  } catch (error) {
    console.warn('获取滚动容器失败:', error)
  }

  return null
}
// 添加内容引用
const scrollContentRef = ref<HTMLElement>()
// 将所有的 scrollToBottom 改为 scrollToTop
// 因为在反向布局中，滚动到顶部才是查看最新消息

// 主要的滚动函数
const scrollToTop = (behavior: 'auto' | 'smooth' = 'auto') => {
  nextTick(() => {
    // 方法1: 优先使用 naive-ui 内置方法
    if (scrollToTopUsingNaiveUI(behavior)) {
      return
    }

    // 方法2: 使用容器获取方法
    const container = getScrollContainer()
    if (container) {
      try {
        container.scrollTo({
          top: 0, // 关键：反向布局中滚动到顶部就是最新消息
          behavior: behavior,
        })
        return
      } catch (error) {
        console.warn('容器获取方法滚动失败:', error)
      }
    }

    // 方法3: 使用直接DOM方法
    scrollToTopDirect(behavior)
  })
}

// 平滑滚动到顶部
const scrollToTopSmooth = () => {
  scrollToTop('smooth')
}

// 使用 naive-ui 内置的滚动方法
const scrollToTopUsingNaiveUI = (behavior: 'auto' | 'smooth' = 'auto') => {
  if (!scrollbarRef.value) {
    return false
  }

  try {
    scrollbarRef.value.scrollTo({
      top: 0, // 反向布局中滚动到顶部
      behavior: behavior,
    })
    return true
  } catch (error) {
    console.warn('naive-ui 内置滚动方法失败:', error)
    return false
  }
}

// 直接DOM滚动方法
const scrollToTopDirect = (behavior: 'auto' | 'smooth' = 'auto') => {
  const possibleSelectors = [
    '.n-scrollbar-container',
    '.n-scrollbar-content',
    '.messages-area',
    '.reverse-layout-container',
    '.n-scrollbar-content-wrapper',
  ]

  for (const selector of possibleSelectors) {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      try {
        element.scrollTo({
          top: 0, // 反向布局中滚动到顶部
          behavior: behavior,
        })
        return true
      } catch (error) {
        console.warn(`滚动 ${selector} 失败:`, error)
      }
    }
  }

  return false
}

// 滚动事件处理 - 保持原有逻辑
const handleScroll = (e: Event) => {
  const container = e.target as HTMLElement
  if (!container) return

  const scrollTop = container.scrollTop

  // 计算距离底部的实际像素距离
  // 在反向布局中，scrollTop 越小表示越靠近底部（最新消息）
  const distanceFromBottom = scrollTop
  const threshold = 100
  const isNearBottom = distanceFromBottom < threshold

  if (autoScrollEnabled.value !== isNearBottom) {
    autoScrollEnabled.value = isNearBottom
  }
}
// 点击滚动按钮
const scrollToTopAndEnable = () => {
  autoScrollEnabled.value = true
  scrollToTopSmooth()
}
// 统一的滚动处理函数
const handleAutoScroll = () => {
  if (!autoScrollEnabled.value) return
  scrollToTop('auto')
}

// 监听消息数量变化
const messageLength = computed(() => currentMessages.value.length)
watch(messageLength, (newVal, oldVal) => {
  if (newVal > oldVal) {
    handleAutoScroll()
  }
})

// 监听流式输出内容变化
watch(
  () => [chatStore.streamingContent, isStreaming.value],
  () => {
    if (autoScrollEnabled.value && isStreaming.value) {
      scrollToTop('auto')
    }
  },
  { deep: true },
)

// 监听加载状态变化
watch(isLoading, (newVal) => {
  if (autoScrollEnabled.value && newVal) {
    handleAutoScroll()
  }
})
// 发送消息时立即滚动
const handleSend = () => {
  // 严格的输入检查
  const trimmedInput = userInput.value.trim()
  if (!trimmedInput || isLoading.value) return
  // 检测内容场景
  const scene = detectContentScene(trimmedInput)
  // 生成场景化增强提示
  const enhancedInput = getSceneEnhancedPrompt(trimmedInput, scene)
  autoScrollEnabled.value = true
  userInput.value = ''
  scrollToTop('auto')
  console.log('🚀 发送场景化消息:', {
    场景类型: scene,
    增强提示: enhancedInput.substring(0, 100) + '...',
  })
  // 发送消息
  chatStore.sendUserMessage(trimmedInput)
}

// 立即滚动到顶部
scrollToTop('auto')
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    if (e.shiftKey) {
      return
    } else {
      e.preventDefault()
      handleSend()
    }
  }
}
// 在 ChatArea.vue 中修改 handleStop 方法
const handleStop = () => {
  console.log('🛑 停止按钮被点击')
  console.log('停止前状态:', {
    isStreaming: isStreaming.value,
    isLoading: isLoading.value,
    currentStreamingMessageId: currentStreamingMessageId.value,
  })

  // 立即停止
  chatStore.stopStreaming()

  // 强制重置加载状态（双重保障）
  nextTick(() => {
    if (isLoading.value) {
      console.log('🔄 强制重置加载状态')
      // 如果需要直接修改 store 状态
      chatStore.isLoading = false
    }
  })

  console.log('停止后状态:', {
    isStreaming: isStreaming.value,
    isLoading: isLoading.value,
    currentStreamingMessageId: currentStreamingMessageId.value,
  })
}
// 计算属性：判断重发按钮是否禁用
const isRegenerateDisabled = computed(() => {
  return isStreaming.value || isLoading.value
})

// 显示重发按钮的条件
const showRegenerateButton = (message: Message) => {
  // 如果是用户消息，且是最后一条用户消息，且当前没有在生成
  if (message.role === 'user') {
    const userMessages = currentMessages.value.filter((msg) => msg.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]
    return message.id === lastUserMessage?.id && !isStreaming.value && !isLoading.value
  }
  // 如果是AI消息，且是最后一条消息，且当前没有在生成
  if (message.role === 'assistant') {
    const lastMessage = currentMessages.value[currentMessages.value.length - 1]
    return message.id === lastMessage?.id && !isStreaming.value && !isLoading.value
  }

  return false
}
// 处理重新生成
const handleRegenerate = (message: Message) => {
  if (isRegenerateDisabled.value) return

  // 调用store的重发方法
  chatStore.regenerateFromMessage(message.id)
}
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
onMounted(() => {
  console.log('🚀 ChatArea 组件挂载')
  console.log('📊 初始状态:', {
    currentMessages: currentMessages.value,
    isLoading: isLoading.value,
    isStreaming: isStreaming.value,
    sessionCount: chatStore.sessions.length,
  })

  // 检查是否有异常的状态
  if (isLoading.value || isStreaming.value) {
    console.warn('⚠️ 检测到异常加载状态，强制重置')
    chatStore.isLoading = false
    chatStore.isStreaming = false
    chatStore.currentStreamingMessageId = null
  }

  nextTick(() => {
    scrollToTop('auto')
  })
})
const renderMessageContent = (content: string): string => {
  return smartRenderMessageContent(content)
}
const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code)
    window.$message?.success('内容已复制到剪贴板')
  } catch (error) {
    console.error('复制失败：', error)
    window.$message?.error('复制失败')
  }
}

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault()
    handleSend()
  }
}

window.addEventListener('keydown', handleGlobalKeydown)
onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

// 暴露方法供父组件调用
defineExpose({
  scrollToTop,
  getScrollContainer,
})
</script>

<style scoped>
/* 样式保持不变 */
.message-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.regenerate-btn {
  color: #666;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.assistant-message:hover .regenerate-btn,
.user-message:hover .regenerate-btn {
  opacity: 1;
}

.regenerate-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 用户消息的重发按钮特殊样式 */
.user-message .regenerate-btn {
  margin-left: 8px;
  opacity: 1; /* 用户消息的重发按钮始终显示 */
}
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  position: relative;
}
.messages-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100%;
  box-sizing: border-box;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
/* 现代化消息项 */
.message-item {
  display: flex;
  width: 100%;
  animation: fadeInUp 0.4s ease-out;
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
/* 用户消息样式 */
.user-message {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

.user-message .message-avatar {
  order: 2;
}

.user-message .message-content-wrapper {
  order: 1;
  max-width: 80%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

/* AI消息样式 */
.assistant-message {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  width: 100%;
}

.assistant-message .message-content-wrapper {
  max-width: 80%;
  display: flex;
  flex-direction: column;
}

.message-avatar {
  flex-shrink: 0;
}

.avatar-user {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  font-weight: 600;
}

.avatar-assistant {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  font-weight: 600;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8 px;
}

.message-sender {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  letter-spacing: -0.01em;
}

.copy-btn {
  color: #666;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.assistant-message:hover .copy-btn {
  opacity: 1;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 20px;
  line-height: 1.6;
  word-wrap: break-word;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  border: 1px solid transparent;
}

.user-bubble {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-bottom-right-radius: 8px;
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.25);
}

.user-bubble:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(16, 185, 129, 0.35);
}

.assistant-bubble {
  background: rgba(255, 255, 255, 0.9);
  color: #1f2937;
  border: 1px solid rgba(229, 231, 235, 0.8);
  border-bottom-left-radius: 8px;
  backdrop-filter: blur(20px);
}

.assistant-bubble:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border-color: rgba(209, 213, 219, 0.6);
}

.message-text {
  font-size: 15px;
  line-height: 1.7;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    'Inter',
    sans-serif;
  letter-spacing: -0.01em;
}
.message-text :deep(p) {
  margin: 0.75em 0;
  color: inherit;
}
.message-text :deep(ul),
.message-text :deep(ol) {
  margin: 0.75em 0;
  padding-left: 1.5em;
}

.message-text :deep(li) {
  margin: 0.5em 0;
  color: inherit;
}

.message-text :deep(blockquote) {
  border-left: 4px solid #e5e7eb;
  margin: 1em 0;
  padding-left: 1em;
  color: #6b7280;
  font-style: italic;
}
.message-time {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 8px;
  font-weight: 400;
  letter-spacing: 0.02em;
}
/* 现代化操作按钮 */
.message-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: all 0.3s ease;
  margin-left: 8px;
}
.streaming-indicator {
  color: #10a37f;
  animation: pulse 2s infinite;
}
.assistant-message:hover .message-actions {
  opacity: 1;
}
.copy-btn,
.regenerate-btn {
  color: #6b7280;
  transition: all 0.3s ease;
  border-radius: 8px;
  padding: 4px 8px;
  min-width: auto;
}

.copy-btn:hover,
.regenerate-btn:hover {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  transform: scale(1.05);
}
.user-message .regenerate-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.regenerate-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
}

/* 用户消息的重发按钮特殊样式 */
.user-message .regenerate-btn {
  margin-left: 12px;
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 输入区域 */
.input-area {
  padding: 24px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(229, 231, 235, 0.8);
  position: relative;
}

.input-area::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(229, 231, 235, 0.8), transparent);
}
.input-container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-input {
  border-radius: 20px;
  border: 1px solid rgba(229, 231, 235, 0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.9);
  overflow: hidden;
}

.message-input:focus-within {
  border-color: #10b981;
  box-shadow:
    0 0 0 3px rgba(16, 185, 129, 0.1),
    0 4px 20px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.message-input :deep(.n-input__textarea) {
  border-radius: 20px;
  padding: 16px 20px;
  font-size: 15px;
  line-height: 1.5;
  resize: none;
  border: none;
  background: transparent;
  font-family: inherit;
  color: #1f2937;
}

.message-input :deep(.n-input__textarea::placeholder) {
  color: #9ca3af;
}

/* 现代化按钮 */
.input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  align-items: center;
}

.send-btn,
.stop-btn {
  border-radius: 16px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0 20px;
  height: 40px;
  font-size: 14px;
  letter-spacing: 0.02em;
}
.send-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}

.send-btn:hover:not(.n-button--disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(16, 185, 129, 0.4);
}

.send-btn:active {
  transform: translateY(0);
}

.stop-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
}
.stop-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(245, 158, 11, 0.4);
}
/* 流式输出效果优化 */
.streaming-content {
  display: inline;
}

.typing-cursor {
  animation: blink 1.2s infinite;
  color: #10b981;
  font-weight: bold;
  margin-left: 2px;
}

.streaming-indicator {
  color: #10b981;
  animation: pulse 2s infinite;
  font-weight: 500;
}
/* 加载状态优化 */
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  color: #6b7280;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  border: 1px solid rgba(229, 231, 235, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
}

/* 滚动按钮 */
.scroll-to-bottom {
  position: absolute;
  right: 32px;
  bottom: 32px;
  z-index: 1000;
}
.scroll-btn {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(229, 231, 235, 0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.scroll-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  background: white;
}

/* 修复反向布局容器的CSS */
.reverse-layout-container {
  /* 关键：使用Flexbox反向布局 */
  display: flex;
  flex-direction: column-reverse;

  /* 修复高度传递问题 */
  min-height: 100vh; /* 改为视口高度 */
  height: auto;

  /* 确保内容可以撑开容器 */
  flex: 1;

  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* 确保父级容器可以滚动 */
.messages-area {
  flex: 1;
  overflow-y: auto; /* 确保可以滚动 */
  position: relative;
  height: 100%; /* 明确高度 */
}

/* 滚动锚点调整 */
.scroll-anchor {
  flex: 1 1 auto;
  min-height: 1px;
  /* 确保占位元素有最小高度 */
  height: 1px;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .messages-container {
    padding: 16px;
  }
  .reverse-layout-container {
    padding: 16px;
  }
  .input-area {
    padding: 20px 16px;
  }
  .user-message .message-content-wrapper,
  .assistant-message .message-content-wrapper {
    max-width: 85%;
  }
  .message-bubble {
    padding: 14px 18px;
    border-radius: 18px;
  }

  .scroll-to-bottom {
    right: 16px;
    bottom: 100px;
  }
  .input-actions {
    gap: 8px;
  }

  .send-btn,
  .stop-btn {
    padding: 0 16px;
    height: 36px;
    font-size: 13px;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .chat-container {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }

  .message-sender {
    color: #f1f5f9;
  }

  .assistant-bubble {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(71, 85, 105, 0.6);
    color: #f1f5f9;
  }

  .assistant-bubble:hover {
    border-color: rgba(100, 116, 139, 0.6);
  }

  .input-area {
    background: rgba(15, 23, 42, 0.8);
    border-top-color: rgba(71, 85, 105, 0.6);
  }
  .message-input {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(71, 85, 105, 0.6);
  }

  .message-input :deep(.n-input__textarea) {
    color: #f1f5f9;
    background: transparent;
  }

  .message-input :deep(.n-input__textarea::placeholder) {
    color: #94a3b8;
  }

  .message-time {
    color: #94a3b8;
  }

  .loading-indicator {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(71, 85, 105, 0.6);
    color: #94a3b8;
  }
  .scroll-btn {
    background: rgba(30, 41, 59, 0.9);
    border-color: rgba(71, 85, 105, 0.6);
  }

  .copy-btn,
  .regenerate-btn {
    color: #94a3b8;
  }

  .copy-btn:hover,
  .regenerate-btn:hover {
    color: #10b981;
    background: rgba(16, 185, 129, 0.15);
  }
}
</style>

<style>
@import url('../styles/markdown.css');
</style>

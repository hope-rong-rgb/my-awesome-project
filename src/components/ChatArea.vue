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
            <!-- 使用动态导入的消息组件 -->
            <Suspense v-for="message in currentMessages" :key="message.id">
              <template #default>
                <ChatMessage
                  :message="message"
                  :is-streaming="isStreaming"
                  :current-streaming-message-id="currentStreamingMessageId"
                  :is-regenerate-disabled="isRegenerateDisabled"
                  :show-regenerate-button="showRegenerateButton(message)"
                  @copy="copyCode"
                  @regenerate="handleRegenerate"
                />
              </template>
              <template #fallback>
                <div class="message-skeleton">
                  <n-skeleton height="60px" :repeat="1" />
                </div>
              </template>
            </Suspense>

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
import { ref, nextTick, onMounted, watch, onUnmounted, computed, defineAsyncComponent } from 'vue'
import { useChatStore, type Message } from '@/stores/chat'
import { storeToRefs } from 'pinia'
import { detectContentScene, getSceneEnhancedPrompt } from '@/utils/markdown'
import type { NScrollbar } from 'naive-ui/es/_internal/scrollbar'

// 动态导入所有依赖
const ChatMessage = defineAsyncComponent(() => 
  import('@/components/ChatMessage.vue')
)

const SendIcon = defineAsyncComponent(() => 
  import('@vicons/ionicons5').then(module => module.SendOutline)
)

const StopIcon = defineAsyncComponent(() => 
  import('@vicons/ionicons5').then(module => module.StopOutline)
)

const ArrowUpIcon = defineAsyncComponent(() => 
  import('@vicons/ionicons5').then(module => module.ArrowUpOutline)
)

// 类型定义
interface ScrollbarExposed {
  containerRef: HTMLElement | null
  scrollTo: (options: { top?: number; left?: number; behavior?: 'auto' | 'smooth' }) => void
}

// Store 和响应式数据
const chatStore = useChatStore()
const { currentMessages, isLoading, isStreaming, currentStreamingMessageId } = storeToRefs(chatStore)
const userInput = ref('')
const scrollbarRef = ref<InstanceType<typeof NScrollbar> & ScrollbarExposed>()
const autoScrollEnabled = ref(true)
const scrollContentRef = ref<HTMLElement>()

// 滚动相关函数
const getScrollContainer = (): HTMLElement | null => {
  if (!scrollbarRef.value) return null

  try {
    if (scrollbarRef.value.containerRef) {
      return scrollbarRef.value.containerRef
    }

    const scrollContainers = [
      '.n-scrollbar-container',
      '.n-scrollbar-content-wrapper',
      '.n-scrollbar-content',
    ]

    for (const selector of scrollContainers) {
      const element = document.querySelector(selector) as HTMLElement
      if (element) return element
    }
  } catch (error) {
    console.warn('获取滚动容器失败:', error)
  }

  return null
}

const scrollToTop = (behavior: 'auto' | 'smooth' = 'auto') => {
  nextTick(() => {
    // 方法1: 优先使用 naive-ui 内置方法
    if (scrollbarRef.value) {
      try {
        scrollbarRef.value.scrollTo({ top: 0, behavior })
        return
      } catch (error) {
        console.warn('naive-ui 内置滚动方法失败:', error)
      }
    }

    // 方法2: 使用容器获取方法
    const container = getScrollContainer()
    if (container) {
      try {
        container.scrollTo({ top: 0, behavior })
        return
      } catch (error) {
        console.warn('容器获取方法滚动失败:', error)
      }
    }

    // 方法3: 使用直接DOM方法
    const possibleSelectors = [
      '.n-scrollbar-container',
      '.n-scrollbar-content',
      '.messages-area',
      '.reverse-layout-container',
    ]

    for (const selector of possibleSelectors) {
      const element = document.querySelector(selector) as HTMLElement
      if (element) {
        try {
          element.scrollTo({ top: 0, behavior })
          return
        } catch (error) {
          console.warn(`滚动 ${selector} 失败:`, error)
        }
      }
    }
  })
}

const scrollToTopSmooth = () => {
  scrollToTop('smooth')
}

const handleScroll = (e: Event) => {
  const container = e.target as HTMLElement
  if (!container) return

  const scrollTop = container.scrollTop
  const distanceFromBottom = scrollTop
  const threshold = 100
  
  const isNearBottom = distanceFromBottom < threshold

  if (autoScrollEnabled.value !== isNearBottom) {
    autoScrollEnabled.value = isNearBottom
  }
}

const scrollToTopAndEnable = () => {
  autoScrollEnabled.value = true
  scrollToTopSmooth()
}

const handleAutoScroll = () => {
  if (!autoScrollEnabled.value) return
  scrollToTop('auto')
}

// 监听器
const messageLength = computed(() => currentMessages.value.length)

watch(messageLength, (newVal, oldVal) => {
  if (newVal > oldVal) {
    handleAutoScroll()
  }
})

watch(
  () => [chatStore.streamingContent, isStreaming.value],
  () => {
    if (autoScrollEnabled.value && isStreaming.value) {
      scrollToTop('auto')
    }
  },
  { deep: true },
)

watch(isLoading, (newVal) => {
  if (autoScrollEnabled.value && newVal) {
    handleAutoScroll()
  }
})

// 业务逻辑
const isRegenerateDisabled = computed(() => {
  return isStreaming.value || isLoading.value
})

const showRegenerateButton = (message: Message) => {
  if (message.role === 'user') {
    const userMessages = currentMessages.value.filter((msg) => msg.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]
    return message.id === lastUserMessage?.id && !isStreaming.value && !isLoading.value
  }
  if (message.role === 'assistant') {
    const lastMessage = currentMessages.value[currentMessages.value.length - 1]
    return message.id === lastMessage?.id && !isStreaming.value && !isLoading.value
  }
  return false
}

const handleRegenerate = (message: Message) => {
  if (isRegenerateDisabled.value) return
  chatStore.regenerateFromMessage(message.id)
}

const handleSend = () => {
  const trimmedInput = userInput.value.trim()
  if (!trimmedInput || isLoading.value) return
  
  const scene = detectContentScene(trimmedInput)
  const enhancedInput = getSceneEnhancedPrompt(trimmedInput, scene)
  
  autoScrollEnabled.value = true
  userInput.value = ''
  
  console.log('🚀 发送场景化消息:', {
    场景类型: scene,
    增强提示: enhancedInput.substring(0, 100) + '...',
  })
  
  chatStore.sendUserMessage(trimmedInput)
}

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

const handleStop = () => {
  console.log('🛑 停止按钮被点击')
  chatStore.stopStreaming()

  nextTick(() => {
    if (isLoading.value) {
      chatStore.isLoading = false
    }
  })
}

const copyCode = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    window.$message?.success('内容已复制到剪贴板')
  } catch (error) {
    console.error('复制失败：', error)
    window.$message?.error('复制失败')
  }
}

// 全局快捷键
const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault()
    handleSend()
  }
}

// 生命周期
onMounted(() => {
  console.log('🚀 ChatArea 组件挂载')
  
  if (isLoading.value || isStreaming.value) {
    console.warn('⚠️ 检测到异常加载状态，强制重置')
    chatStore.isLoading = false
    chatStore.isStreaming = false
    chatStore.currentStreamingMessageId = null
  }

  nextTick(() => {
    scrollToTop('auto')
  })

  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

// 暴露方法
defineExpose({
  scrollToTop,
  getScrollContainer,
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  position: relative;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  position: relative;
  height: 100%;
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

.reverse-layout-container {
  display: flex;
  flex-direction: column-reverse;
  min-height: 100vh;
  height: auto;
  flex: 1;
}

.scroll-anchor {
  flex: 1 1 auto;
  min-height: 1px;
  height: 1px;
}

.message-skeleton {
  padding: 12px 0;
}

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
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1), 0 4px 20px rgba(0, 0, 0, 0.1);
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

.stop-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
}

.stop-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(245, 158, 11, 0.4);
}

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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
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
  }

  .message-input :deep(.n-input__textarea::placeholder) {
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
}
</style>
<style>
@import url('../styles/markdown.css');
</style>
<template>
  <div class="chat-container">
    <!-- 消息展示区 -->
    <div class="messages-area">
      <!-- 滚动到底部按钮 -->
      <transition name="fade">
        <div v-if="showScrollButton" class="scroll-to-bottom">
          <n-tooltip placement="left">
            <template #trigger>
              <n-button circle size="small" @click="scrollToBottom" class="scroll-btn">
                <template #icon>
                  <n-icon><ArrowDownIcon /></n-icon>
                </template>
              </n-button>
            </template>
            回到底部
          </n-tooltip>
        </div>
      </transition>

      <n-scrollbar ref="scrollbarRef" @scroll="handleScroll">
        <div class="messages-container">
          <div class="messages-list">
            <!-- 消息列表 -->
            <ChatMessage
              v-for="message in currentMessages"
              :key="message.id"
              :message="message"
              :is-streaming="isStreaming && message.id === currentStreamingMessageId"
              :is-regenerate-disabled="isLoading || isStreaming"
              :show-regenerate-button="showRegenerateButton(message)"
              @copy="copyCode"
              @regenerate="handleRegenerate"
            />

            <!-- 加载状态 -->
            <div v-if="isLoading && !isStreaming" class="message-item message-assistant">
              <div class="assistant-message">
                <div class="message-avatar">
                  <n-avatar round size="small" class="avatar-assistant">AI</n-avatar>
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
          placeholder="输入你的问题... (Enter发送, Shift+Enter换行)"
          :autosize="{ minRows: 1, maxRows: 4 }"
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
import { ref, nextTick, onMounted, watch } from 'vue'
import { useChatStore, type Message } from '@/stores/chat'
import { storeToRefs } from 'pinia'
import ChatMessage from '@/components/ChatMessage.vue'
import { SendOutline as SendIcon, StopOutline as StopIcon, ArrowDownOutline as ArrowDownIcon } from '@vicons/ionicons5'

// Store 和响应式数据
const chatStore = useChatStore()
const { currentMessages, isLoading, isStreaming, currentStreamingMessageId } = storeToRefs(chatStore)
const userInput = ref('')
const scrollbarRef = ref()
const showScrollButton = ref(false)
const isUserScrolling = ref(false)

// 滚动控制
const scrollToBottom = (smooth = true) => {
  nextTick(() => {
    const scrollbar = scrollbarRef.value
    if (scrollbar?.scrollTo) {
      scrollbar.scrollTo({
        top: scrollbar.containerRef?.scrollHeight || 999999,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  })
}

const handleScroll = (e: Event) => {
  const container = e.target as HTMLElement
  if (!container) return

  const { scrollTop, scrollHeight, clientHeight } = container
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight
  const threshold = 100

  // 用户主动滚动
  if (distanceFromBottom > threshold) {
    isUserScrolling.value = true
    showScrollButton.value = true
  } else {
    isUserScrolling.value = false
    showScrollButton.value = false
  }
}

// 业务逻辑
const showRegenerateButton = (message: Message) => {
  if (isStreaming.value || isLoading.value) return false

  const lastMessage = currentMessages.value[currentMessages.value.length - 1]
  return message.id === lastMessage?.id
}

const handleRegenerate = (message: Message) => {
  if (isLoading.value || isStreaming.value) return
  chatStore.regenerateFromMessage(message.id)
}

const handleSend = () => {
  const trimmedInput = userInput.value.trim()
  if (!trimmedInput || isLoading.value) return

  userInput.value = ''
  isUserScrolling.value = false
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
}

const copyCode = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    window.$message?.success('内容已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    window.$message?.error('复制失败')
  }
}

// 监听消息变化,自动滚动
watch(
  () => currentMessages.value.length,
  () => {
    if (!isUserScrolling.value) {
      scrollToBottom(false)
    }
  }
)

// 监听流式输出,自动滚动
watch(
  () => chatStore.streamingContent,
  () => {
    if (isStreaming.value && !isUserScrolling.value) {
      scrollToBottom(false)
    }
  }
)

// 生命周期
onMounted(() => {
  console.log('🚀 ChatArea 组件挂载')
  nextTick(() => {
    scrollToBottom(false)
  })
})

defineExpose({
  scrollToBottom,
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
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.messages-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.message-item {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  flex-shrink: 0;
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
}

.message-input:focus-within {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1), 0 4px 20px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.send-btn,
.stop-btn {
  border-radius: 16px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0 20px;
  height: 40px;
  font-size: 14px;
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

@media (max-width: 768px) {
  .messages-container {
    padding: 16px;
  }

  .input-area {
    padding: 20px 16px;
  }

  .scroll-to-bottom {
    right: 16px;
    bottom: 100px;
  }
}

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
<template>
  <div
    :class="{
      'message-item': true,
      'message-user': message.role === 'user',
      'message-assistant': message.role === 'assistant',
    }"
  >
    <!-- 用户消息 -->
    <div v-if="message.role === 'user'" class="user-message">
      <div class="message-avatar">
        <n-avatar round size="small" class="avatar-user">你</n-avatar>
      </div>
      <div class="message-content-wrapper">
        <div class="message-header">
          <span class="message-sender">你</span>
          <n-button
            v-if="showRegenerateButton"
            text
            size="tiny"
            @click="$emit('regenerate', message)"
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
          <div class="message-text" v-html="renderedContent"></div>
        </div>
        <div class="message-time">
          {{ formatTime(message.timestamp) }}
        </div>
      </div>
    </div>

    <!-- AI消息 -->
    <div v-else class="assistant-message">
      <div class="message-avatar">
        <n-avatar round size="small" class="avatar-assistant">AI</n-avatar>
      </div>
      <div class="message-content-wrapper">
        <div class="message-header">
          <span class="message-sender">AI助手</span>
          <div class="message-actions">
            <n-button
              text
              size="tiny"
              @click="$emit('copy', message.content)"
              class="copy-btn"
              title="复制内容"
            >
              <template #icon>
                <n-icon size="14"><CopyIcon /></n-icon>
              </template>
            </n-button>
            <n-button
              v-if="showRegenerateButton"
              text
              size="tiny"
              @click="$emit('regenerate', message)"
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
          <div v-if="isStreaming" class="streaming-content">
            <span v-html="renderedContent"></span>
            <span class="typing-cursor">|</span>
          </div>
          <div v-else class="static-content">
            <span v-html="renderedContent"></span>
          </div>
        </div>
        <div class="message-time">
          {{ formatTime(message.timestamp) }}
          <span v-if="isStreaming" class="streaming-indicator">· 正在输入</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CopyOutline as CopyIcon, RefreshOutline as RefreshIcon } from '@vicons/ionicons5'
import { computed, watch } from 'vue'
import type { Message } from '@/stores/chat'
import { renderMessageContent } from '@/utils/markdown'

interface Props {
  message: Message
  isStreaming?: boolean
  isRegenerateDisabled?: boolean
  showRegenerateButton?: boolean
}

const props = defineProps<Props>()

// 渲染后的内容
const renderedContent = computed(() => {
  return renderMessageContent(props.message.content)
})

// 监听流式更新
watch(
  () => props.message.content,
  () => {
    // 流式内容会自动通过computed更新
  }
)

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
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
  margin-bottom: 8px;
}

.message-sender {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  letter-spacing: -0.01em;
}

.message-bubble {
  padding: 16px 20px;
  border-radius: 20px;
  line-height: 1.6;
  word-wrap: break-word;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
}

.message-time {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 8px;
  font-weight: 400;
}

.message-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.3s ease;
  margin-left: 8px;
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
}

.copy-btn:hover,
.regenerate-btn:hover {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  transform: scale(1.05);
}

.user-message .regenerate-btn {
  margin-left: 12px;
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.user-message .regenerate-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.regenerate-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@media (prefers-color-scheme: dark) {
  .message-sender {
    color: #f1f5f9;
  }

  .assistant-bubble {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(71, 85, 105, 0.6);
    color: #f1f5f9;
  }

  .message-time {
    color: #94a3b8;
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
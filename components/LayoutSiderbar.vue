<!-- 主布局组件，包含侧边栏和聊天区域 -->
<template>
  <n-config-provider :theme="darkThemeEnabled ? darkTheme : null">
    <n-layout class="app-layout" has-sider>
      <!-- 左侧会话列表侧边栏 -->
      <AppSidebar />

      <!-- 右侧主聊天区域 -->
      <n-layout-content class="main-content">
        <ChatArea />
        <!-- 主题切换按钮 -->
        <div class="theme-toggle">
          <n-button @click="toggleTheme" size="small">
            {{ darkThemeEnabled ? '浅色模式' : '暗色模式' }}
          </n-button>
        </div>
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider, NLayout, NLayoutContent, NButton } from 'naive-ui'
import { darkTheme } from 'naive-ui'
import ChatArea from '@/components/ChatArea.vue'
import { ref } from 'vue'
import AppSidebar from '@/components/AppSiderbar.vue'

// 暗色主题开关状态
const darkThemeEnabled = ref(false)

/**
 * 切换主题模式
 */
const toggleTheme = () => {
  darkThemeEnabled.value = !darkThemeEnabled.value
}
</script>

<style scoped>
.app-layout {
  height: 100vh;
}

.main-content {
  background-color: #ffffff;
  position: relative;
  flex: 1;
  overflow: hidden;
}

.theme-toggle {
  position: absolute;
  top: 20px;
  right: 20px;
}

/* 暗色主题 */
:deep(.n-config-provider) {
  transition: background-color 0.3s ease;
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .main-content {
    background-color: #252525;
  }
}
</style>

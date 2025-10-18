<!-- 主布局组件，包含侧边栏和聊天区域 -->
<template>
  <n-config-provider :theme="darkThemeEnabled ? darkTheme : null">
    <n-layout class="app-layout" has-sider>
      <!-- 左侧会话列表侧边栏 -->
      <AppSidebar />

      <!-- 右侧主聊天区域 -->
      <n-layout-content class="main-content">
        <Suspense>
          <template #default>
            <ChatArea />
          </template>
          <template #fallback>
            <div class="loading-fallback">
              <n-spin size="large" />
              <span>加载中...</span>
            </div>
          </template>
        </Suspense>
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
import { darkTheme } from 'naive-ui'
import { ref, defineAsyncComponent } from 'vue'
import AppSidebar from '@/components/AppSiderbar.vue'

// 使用动态导入 ChatArea
const ChatArea = defineAsyncComponent(() => 
  import('@/components/ChatArea.vue')
)

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
  z-index: 1000;
}

.loading-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #666;
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
  
  .loading-fallback {
    color: #999;
  }
}
</style>
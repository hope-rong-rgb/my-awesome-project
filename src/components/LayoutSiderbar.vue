<!-- 主布局组件，包含侧边栏和聊天区域 -->
<template>
  <n-config-provider :theme="darkThemeEnabled ? darkTheme : null">
    <n-layout class="app-layout" has-sider>
      <!-- 左侧会话列表侧边栏 -->
      <AppSidebar />

      <!-- 右侧主聊天区域 -->
      <n-layout-content class="main-content" :class="{ 'dark-mode': darkThemeEnabled }">
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
          <n-button @click="toggleTheme" size="small" :type="darkThemeEnabled ? 'default' : 'primary'">
            <template #icon>
              <n-icon>
                <component :is="darkThemeEnabled ? SunnyIcon : MoonIcon" />
              </n-icon>
            </template>
            {{ darkThemeEnabled ? '浅色' : '暗色' }}
          </n-button>
        </div>
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>

<script setup lang="ts">
import { darkTheme } from 'naive-ui'
import { ref, defineAsyncComponent, onMounted, watch } from 'vue'
import AppSidebar from '@/components/AppSiderbar.vue'

// 使用动态导入 ChatArea
const ChatArea = defineAsyncComponent(() => 
  import('@/components/ChatArea.vue')
)

// 动态导入图标
const MoonIcon = defineAsyncComponent(() => 
  import('@vicons/ionicons5').then(module => module.Moon)
)

const SunnyIcon = defineAsyncComponent(() => 
  import('@vicons/ionicons5').then(module => module.Sunny)
)

// 从 localStorage 读取主题设置
const THEME_STORAGE_KEY = 'ai-talk-theme'

const darkThemeEnabled = ref(false)

/**
 * 从 localStorage 加载主题设置
 */
const loadThemeFromStorage = () => {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme !== null) {
      darkThemeEnabled.value = savedTheme === 'dark'
    } else {
      // 如果没有保存的设置，使用系统主题偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      darkThemeEnabled.value = prefersDark
    }
  } catch (error) {
    console.warn('加载主题设置失败:', error)
  }
}

/**
 * 保存主题设置到 localStorage
 */
const saveThemeToStorage = (isDark: boolean) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light')
  } catch (error) {
    console.warn('保存主题设置失败:', error)
  }
}

/**
 * 切换主题模式
 */
const toggleTheme = () => {
  darkThemeEnabled.value = !darkThemeEnabled.value
  saveThemeToStorage(darkThemeEnabled.value)
  
  // 应用到 body 类，方便全局样式使用
  if (darkThemeEnabled.value) {
    document.documentElement.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark-mode')
  }
}

/**
 * 应用当前主题到 DOM
 */
const applyTheme = () => {
  if (darkThemeEnabled.value) {
    document.documentElement.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark-mode')
  }
}

//监听系统主题变化
const watchSystemTheme = () => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const handleChange = (e: MediaQueryListEvent) => {
    // 只有在用户没有手动设置时才跟随系统
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (!savedTheme) {
      darkThemeEnabled.value = e.matches
      applyTheme()
    }
  }
  
  mediaQuery.addEventListener('change', handleChange)
  
  return () => {
    mediaQuery.removeEventListener('change', handleChange)
  }
}

// 监听主题变化
watch(darkThemeEnabled, (newValue) => {
  applyTheme()
  console.log('🎨 主题已切换:', newValue ? '暗色模式' : '浅色模式')
})

// 组件挂载时加载主题
onMounted(() => {
  loadThemeFromStorage()
  applyTheme()
  watchSystemTheme()
})
</script>

<style scoped>
.app-layout {
  height: 100vh;
  overflow: hidden; /* 🔧 防止布局本身出现滚动条 */
}

.main-content {
  background-color: #ffffff;
  position: relative;
  flex: 1;
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.main-content.dark-mode {
  background-color: #0f172a;
}

.theme-toggle {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.theme-toggle :deep(.n-button) {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(229, 231, 235, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.theme-toggle :deep(.n-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dark-mode .theme-toggle :deep(.n-button) {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(71, 85, 105, 0.8);
  color: #f1f5f9;
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

.dark-mode .loading-fallback {
  color: #94a3b8;
}

:deep(.n-config-provider) {
  transition: background-color 0.3s ease;
}
</style>

<style>
html.dark-mode {
  color-scheme: dark;
}

html.dark-mode body {
  background-color: #0f172a;
  color: #f1f5f9;
}
</style>
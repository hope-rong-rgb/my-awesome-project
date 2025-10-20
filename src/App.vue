<template>
  <n-config-provider :theme="darkThemeEnabled ? darkTheme : null">
    <n-layout class="app-layout" has-sider>
      <!-- 左侧会话列表侧边栏 -->
      <AppSidebar />

      <!-- 右侧主聊天区域 -->
      <n-layout-content class="main-content" :class="{ 'dark-mode': darkThemeEnabled }">
        <ChatArea />
        
        <!-- 主题切换按钮 -->
        <div class="theme-toggle">
          <n-button 
            @click="toggleTheme" 
            size="small" 
            :type="darkThemeEnabled ? 'default' : 'primary'"
            circle
          >
            <template #icon>
              <n-icon>
                <component :is="darkThemeEnabled ? SunnyIcon : MoonIcon" />
              </n-icon>
            </template>
          </n-button>
        </div>
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>

<script setup lang="ts">
import { darkTheme } from 'naive-ui'
import { ref, watch, onMounted } from 'vue'
import { Moon as MoonIcon, Sunny as SunnyIcon } from '@vicons/ionicons5'
import AppSidebar from '@/components/AppSiderbar.vue'
import ChatArea from '@/components/ChatArea.vue'

// 主题设置相关
const THEME_STORAGE_KEY = 'ai-talk-theme'
const darkThemeEnabled = ref(false)

/**
 * 从localStorage加载主题设置
 */
const loadThemeFromStorage = () => {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme !== null) {
      darkThemeEnabled.value = savedTheme === 'dark'
    } else {
      // 使用系统主题偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      darkThemeEnabled.value = prefersDark
    }
  } catch (error) {
    console.warn('加载主题设置失败:', error)
  }
}

/**
 * 保存主题设置到localStorage
 */
const saveThemeToStorage = (isDark: boolean) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light')
  } catch (error) {
    console.warn('保存主题设置失败:', error)
  }
}

/**
 * 应用主题到DOM
 */
const applyTheme = (isDark: boolean) => {
  if (isDark) {
    document.documentElement.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark-mode')
  }
}

/**
 * 切换主题模式
 */
const toggleTheme = () => {
  darkThemeEnabled.value = !darkThemeEnabled.value
  saveThemeToStorage(darkThemeEnabled.value)
  applyTheme(darkThemeEnabled.value)
}

/**
 * 监听系统主题变化
 */
const watchSystemTheme = () => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const handleChange = (e: MediaQueryListEvent) => {
    // 只有在用户没有手动设置时才跟随系统
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (!savedTheme) {
      darkThemeEnabled.value = e.matches
      applyTheme(e.matches)
    }
  }

  mediaQuery.addEventListener('change', handleChange)

  return () => {
    mediaQuery.removeEventListener('change', handleChange)
  }
}

// 监听主题变化
watch(darkThemeEnabled, (newValue) => {
  applyTheme(newValue)
  console.log('🎨 主题已切换:', newValue ? '暗色模式' : '浅色模式')
})

// 组件挂载时加载主题
onMounted(() => {
  loadThemeFromStorage()
  applyTheme(darkThemeEnabled.value)
  watchSystemTheme()
})
</script>

<style scoped>
.app-layout {
  height: 100vh;
  overflow: hidden;
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
  width: 40px;
  height: 40px;
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
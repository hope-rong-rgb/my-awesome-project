<template>
  <!-- 应用根组件，使用 Naive UI 配置器包装整个应用 -->
  <n-config-provider :theme="theme">
    <!-- 路由视图容器，显示当前路由对应的组件 -->
    <router-view />
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider } from 'naive-ui'
import { ref } from 'vue'

// 主题配置，当前为浅色主题（null表示使用默认主题）
const theme = ref(null)
</script>
<style>
html,
body,
#app {
  height: 100%;
  padding: 0;
  margin: 0;
}
</style>

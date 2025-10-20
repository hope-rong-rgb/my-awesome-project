<template>
  <div class="home-view">
    <!-- 这里放置主要内容，App.vue已经包含了布局 -->
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  console.log('📄 HomeView 组件已挂载')
})
</script>

<style scoped>
.home-view {
  width: 100%;
  height: 100%;
}
</style>
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      // 使用动态导入
      component: () => import('@/components/LayoutSiderbar.vue'),
    }
  ],
})

export default router
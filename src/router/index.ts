/**
 * Vue Router 路由配置
 */
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: {
      title: 'AI对话框',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 全局前置守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  const title = (to.meta.title as string) || 'AI对话框'
  document.title = title
  next()
})

// 全局后置守卫 - 页面滚动
router.afterEach(() => {
  window.scrollTo(0, 0)
})

export default router
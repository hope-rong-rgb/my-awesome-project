import { createRouter, createWebHistory } from 'vue-router'
import LayoutSiderbar from '@/components/LayoutSiderbar.vue' //导入layout组件
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: LayoutSiderbar, // 将根路径指向我们的布局组件
    },
  ],
})
export default router

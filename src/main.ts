import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import router from './router'
import App from './App.vue'
import naive from './plugins/naive-ui'

// 创建 Vue 应用实例
const app = createApp(App)

// 创建 Pinia 状态管理实例
const pinia = createPinia()

// 配置 Pinia 持久化插件，将状态保存到 localStorage
pinia.use(
  createPersistedState({
    storage: localStorage,
    serializer: {
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    },
  }),
)

// 注册插件
app.use(naive)      // Naive UI 组件库
app.use(pinia)     // Pinia 状态管理
app.use(router)    // Vue Router 路由

// 挂载应用到 DOM
app.mount('#app')

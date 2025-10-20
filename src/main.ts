import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import router from './router'
import App from './App.vue'
import naive from './plugins/naive-ui'

// 导入样式
import './styles/global.css'
import './styles/markdown.css'

/**
 * 创建Vue应用实例
 */
const app = createApp(App)

/**
 * 创建并配置Pinia状态管理
 */
const pinia = createPinia()

// 配置持久化插件
pinia.use(
  createPersistedState({
    storage: localStorage,
    key: (id) => `ai-talk-${id}`, // 添加命名空间前缀
    serializer: {
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    }
  })
)

/**
 * 注册插件
 */
app.use(pinia) // Pinia 状态管理
app.use(router) // Vue Router 路由
app.use(naive) // Naive UI 组件库

/**
 * 全局错误处理
 */
app.config.errorHandler = (err, instance, info) => {
  console.error('❌ 全局错误:', err)
  console.error('组件:', instance)
  console.error('错误信息:', info)

  // 在生产环境可以上报到错误监控服务
  if (import.meta.env.PROD) {
    // TODO: 上报错误到监控服务
  }
}

/**
 * 全局警告处理
 */
app.config.warnHandler = (msg, instance, trace) => {
  if (import.meta.env.DEV) {
    console.warn('⚠️ 警告:', msg)
    console.warn('组件:', instance)
    console.warn('追踪:', trace)
  }
}

/**
 * 挂载应用
 */
app.mount('#app')

/**
 * 开发环境日志
 */
if (import.meta.env.DEV) {
  console.log('🎉 AI Talk 应用启动成功')
  console.log('📦 当前环境:', import.meta.env.MODE)
  console.log('🔧 Vue版本:', app.version)
  console.log('🌐 基础URL:', import.meta.env.BASE_URL)

  // 开发工具提示
  console.log('%c开发提示', 'color: #10b981; font-weight: bold; font-size: 14px;')
  console.log('- 使用 Ctrl+Shift+I 打开开发者工具')
  console.log('- 安装 Vue DevTools 浏览器扩展获得更好的调试体验')
  console.log('- API密钥配置: .env.local 文件')
}

/**
 * 性能监控 (开发环境)
 */
if (import.meta.env.DEV) {
  // 监控首次渲染时间
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (perfData) {
      console.log('⚡ 性能数据:')
      console.log(`- DNS查询: ${perfData.domainLookupEnd - perfData.domainLookupStart}ms`)
      console.log(`- TCP连接: ${perfData.connectEnd - perfData.connectStart}ms`)
      console.log(`- 首字节: ${perfData.responseStart - perfData.requestStart}ms`)
      console.log(`- 内容下载: ${perfData.responseEnd - perfData.responseStart}ms`)
      console.log(`- DOM解析: ${perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart}ms`)
      console.log(`- 页面加载: ${perfData.loadEventEnd - perfData.loadEventStart}ms`)
      console.log(`- 总耗时: ${perfData.loadEventEnd - perfData.fetchStart}ms`)
    }
  })
}

/**
 * 环境变量检查
 */
if (!import.meta.env.VITE_ZHIPU_API_KEY) {
  console.warn('⚠️ 未检测到API密钥,请在.env.local中配置VITE_ZHIPU_API_KEY')
  console.log('📝 配置步骤:')
  console.log('1. 在项目根目录创建 .env.local 文件')
  console.log('2. 添加: VITE_ZHIPU_API_KEY=你的API密钥')
  console.log('3. 重启开发服务器')
}

export default app
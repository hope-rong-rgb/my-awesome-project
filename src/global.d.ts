/**
 * 全局类型声明文件
 */

import type { MessageApi, NotificationApi, DialogApi } from 'naive-ui'

// 声明全局Window接口扩展
declare global {
  interface Window {
    // Naive UI 全局API
    $message: MessageApi
    $notification: NotificationApi
    $dialog: DialogApi

    // 自定义全局方法
    copyCodeToClipboard: (button: HTMLElement) => Promise<void>
  }

  // Vue组件类型增强
  interface ComponentCustomProperties {
    $message: MessageApi
    $notification: NotificationApi
    $dialog: DialogApi
  }
}

// 环境变量类型定义
interface ImportMetaEnv {
  readonly VITE_ZHIPU_API_KEY: string
  readonly VITE_APP_TITLE: string
  readonly BASE_URL: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ImportMeta {
  readonly env: ImportMetaEnv
}

// 导出空对象以使此文件成为模块
export {}
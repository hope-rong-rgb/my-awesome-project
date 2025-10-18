// 声明全局属性
declare global {
  interface Window {
    $message?: {
      success: (msg: string) => void
      error: (msg: string) => void
    }
  }
}
export {}

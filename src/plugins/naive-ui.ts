/**
 * Naive UI 组件按需导入配置
 */
import type { App } from 'vue'
import {
  create,
  NConfigProvider,
  NLayout,
  NLayoutSider,
  NLayoutContent,
  NButton,
  NInput,
  NScrollbar,
  NAvatar,
  NIcon,
  NSpin,
  NTooltip,
  NDropdown,
  NEmpty,
  NH2,
  NMessageProvider,
  NNotificationProvider,
  NDialogProvider,
} from 'naive-ui'

const naive = create({
  components: [
    NConfigProvider,
    NLayout,
    NLayoutSider,
    NLayoutContent,
    NButton,
    NInput,
    NScrollbar,
    NAvatar,
    NIcon,
    NSpin,
    NTooltip,
    NDropdown,
    NEmpty,
    NH2,
    NMessageProvider,
    NNotificationProvider,
    NDialogProvider,
  ],
})

export default {
  install(app: App) {
    app.use(naive)
  },
}
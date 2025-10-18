import { create } from 'naive-ui'

// 只导入实际使用的组件
import {
  NConfigProvider,
  NLayout,
  NLayoutSider,
  NLayoutContent,
  NButton,
  NInput,
  NAvatar,
  NMessageProvider,
  NSpin,
  NTooltip,
  NIcon,
  NScrollbar,
  NH2, 
  NEmpty
} from 'naive-ui'

const naive = create({
  components: [
    NConfigProvider,
    NLayout,
    NLayoutSider,
    NLayoutContent,
    NButton,
    NInput,
    NAvatar,
    NMessageProvider,
    NSpin,
    NTooltip,
    NIcon,
    NScrollbar,
    NH2, 
    NEmpty,
  ]
})

export default naive
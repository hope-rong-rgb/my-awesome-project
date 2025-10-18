<template>
  <!-- 左侧对话列表 -->
  <n-layout-sider
    bordered
    collapse-mode="width"
    :collapsed-width="64"
    :width="280"
    :native-scrollbar="false"
    :show-trigger="false"
    :collapsed="collapsed"
    @update:collapsed="handleCollapse"
    class="app-sidebar"
  >
    <!-- 展开状态 -->
    <div v-if="!collapsed" class="sidebar-expanded">
      <!-- 标题区域 -->
      <div class="sidebar-header">
        <div class="header-top">
          <n-h2 class="sidebar-title">对话列表</n-h2>
          <n-button type="primary" @click="handleCreateNew" class="new-chat-btn" strong secondary>
            <template #icon>
              <n-icon>
                <AddIcon />
              </n-icon>
            </template>
            新建对话
          </n-button>
        </div>
        <!-- 收起按钮 -->
        <n-button quaternary circle size="small" class="collapse-btn" @click="collapsed = true">
          <template #icon>
            <n-icon>
              <ArrowIcon />
            </n-icon>
          </template>
        </n-button>
      </div>
      <!-- 对话列表 -->
      <div class="session-list-container">
        <n-scrollbar>
          <div v-if="sessions.length > 0" class="session-list">
            <!-- 按时间分组显示 -->
            <template v-for="group in groupedSessions" :key="group.type">
              <!-- 分组标题 -->
              <div class="time-group-header" v-if="group.sessions.length > 0">
                {{ group.title }}
              </div>
              <!-- 分组内的对话项 -->
              <div
                v-for="session in group.sessions"
                :key="session.id"
                class="session-item"
                :class="{
                  'session-item--active': session.id === currentSessionId,
                  'session-item--editing': editingSessionId === session.id,
                }"
              >
                <!-- 会话内容 -->
                <div class="session-content" @click="handleSwitchSession(session.id)">
                  <div class="session-icon">
                    <n-icon size="16">
                      <ChatboxOutlineIcon />
                    </n-icon>
                  </div>
                  <div class="session-info">
                    <div class="session-header">
                      <div v-if="editingSessionId === session.id" class="edit-input">
                        <n-input
                          v-model:value="editTitle"
                          size="small"
                          placeholder="输入对话标题"
                          @keyup.enter="handleSaveEdit"
                          @keyup.esc="handleCancelEdit"
                          autofocus
                        />
                      </div>
                      <div v-else class="session-title-container">
                        <span class="session-title" :title="session.title">
                          {{ truncateTitle(session.title) }}
                        </span>
                      </div>
                    </div>
                    <div class="session-time">
                      {{ formatDisplayTime(session.createdAt) }}
                    </div>
                  </div>
                </div>
                <!-- 操作菜单 -->
                <div class="session-menu">
                  <!-- 省略号菜单按钮 -->
                  <n-button
                    v-if="editingSessionId !== session.id"
                    quaternary
                    circle
                    size="tiny"
                    class="menu-toggle"
                    @click.stop="toggleMenu(session.id, $event)"
                  >
                    <template #icon>
                      <n-icon size="16">
                        <EllipsisHorizontalIcon />
                      </n-icon>
                    </template>
                  </n-button>
                  <!-- 菜单下拉框 -->
                  <div
                    v-if="activeMenuId === session.id"
                    class="menu-dropdown"
                    :data-menu-id="session.id"
                  >
                    <div class="menu-item" @click.stop="handleStartEdit(session)">
                      <n-icon size="14">
                        <EditIcon />
                      </n-icon>
                      <span>重命名</span>
                    </div>
                    <div class="menu-divider"></div>
                    <div class="menu-item delete" @click.stop="handleDeleteSession(session.id)">
                      <n-icon size="14">
                        <TrashIcon />
                      </n-icon>
                      <span>删除</span>
                    </div>
                  </div>
                  <!-- 编辑状态按钮 -->
                  <div v-else-if="editingSessionId === session.id" class="edit-buttons">
                    <n-button
                      quaternary
                      circle
                      size="tiny"
                      type="primary"
                      @click.stop="handleSaveEdit"
                      class="action-btn"
                    >
                      <template #icon>
                        <n-icon size="16"><CheckmarkIcon /></n-icon>
                      </template>
                    </n-button>
                    <n-button
                      quaternary
                      circle
                      size="tiny"
                      @click.stop="handleCancelEdit"
                      class="action-btn"
                    >
                      <template #icon>
                        <n-icon size="16"><CloseIcon /></n-icon>
                      </template>
                    </n-button>
                  </div>
                </div>
              </div>
            </template>
          </div>
          <!-- 空状态 -->
          <n-empty v-else class="empty-state" description="暂无对话">
            <template #icon>
              <n-icon size="60" :depth="2">
                <ChatboxOutlineIcon />
              </n-icon>
            </template>
            <template #extra>
              <n-button size="small" type="primary" @click="handleCreateNew"> 开启新对话 </n-button>
            </template>
          </n-empty>
        </n-scrollbar>
      </div>
    </div>
    <!-- 收起状态（已修复v-else报错） -->
    <div v-else class="sidebar-collapsed">
      <div class="collapsed-content">
        <!-- 顶部按钮区域 -->
        <div class="collapsed-actions">
          <n-tooltip placement="right" trigger="hover">
            <template #trigger>
              <n-button circle type="primary" class="collapsed-new-chat" @click="handleCreateNew">
                <template #icon>
                  <n-icon>
                    <AddIcon />
                  </n-icon>
                </template>
              </n-button>
            </template>
            新建对话
          </n-tooltip>
          <n-tooltip placement="right" trigger="hover">
            <template #trigger>
              <n-button circle quaternary class="expand-btn" @click="collapsed = false">
                <template #icon>
                  <n-icon>
                    <MenuIcon />
                  </n-icon>
                </template>
              </n-button>
            </template>
            展开边栏
          </n-tooltip>
        </div>
        <!-- 最近对话列表（补充v-if/v-else和v-for） -->
        <div class="collapsed-sessions">
          <n-scrollbar>
            <div class="collapsed-session-list">
              <!-- 有会话时：循环渲染会话图标 -->
              <div v-if="sessions.length > 0">
                <div
                  v-for="session in sessions"
                  :key="session.id"
                  class="collapsed-session-item"
                  :class="{ 'collapsed-session-item--active': session.id === currentSessionId }"
                  @click="handleSwitchSession(session.id)"
                >
                  <n-tooltip placement="right" trigger="hover">
                    <template #trigger>
                      <n-icon size="16"><ChatboxOutlineIcon /></n-icon>
                    </template>
                    {{ session.title }}
                  </n-tooltip>
                </div>
              </div>
              <!-- 无会话时：显示空状态（v-else与v-if相邻，修复报错） -->
              <div v-else class="collapsed-empty">
                <n-tooltip placement="right" trigger="hover">
                  <template #trigger>
                    <n-icon size="16" color="#999"><ChatboxOutlineIcon /></n-icon>
                  </template>
                  暂无对话
                </n-tooltip>
              </div>
            </div>
          </n-scrollbar>
        </div>
      </div>
    </div>
  </n-layout-sider>
</template>

<script setup lang="ts">
import { useChatStore } from '../stores/chat'
import {
  Add as AddIcon,
  TrashOutline as TrashIcon,
  ChatboxOutline as ChatboxOutlineIcon,
  CreateOutline as EditIcon,
  CheckmarkOutline as CheckmarkIcon,
  CloseOutline as CloseIcon,
  EllipsisHorizontal as EllipsisHorizontalIcon,
  ArrowUndoOutline as ArrowIcon,
  MenuOutline as MenuIcon,
} from '@vicons/ionicons5'
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'

interface Session {
  id: string
  title: string
  createdAt: number
}

interface GroupedSession {
  type: string
  title: string
  sessions: Session[]
}

const chatStore = useChatStore()
const { sessions, currentSessionId } = storeToRefs(chatStore)

// 侧边栏收起状态
const collapsed = ref(false)
// 重命名相关状态
const editingSessionId = ref<string | null>(null)
const editTitle = ref('')
const originalTitle = ref('')
// 菜单相关状态
const activeMenuId = ref<string | null>(null)

// 计算属性：按时间分组
const groupedSessions = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const groups: GroupedSession[] = [
    { type: 'today', title: '今天', sessions: [] },
    { type: '7days', title: '7天内', sessions: [] },
    { type: '30days', title: '30天内', sessions: [] },
    { type: 'older', title: '更早', sessions: [] },
  ]

  // 对会话按创建时间倒序排序
  const sortedSessions = [...sessions.value].sort((a, b) => b.createdAt - a.createdAt)

  sortedSessions.forEach((session) => {
    const sessionDate = new Date(session.createdAt)
    const sessionDay = new Date(
      sessionDate.getFullYear(),
      sessionDate.getMonth(),
      sessionDate.getDate(),
    )

    if (sessionDay.getTime() === today.getTime()) {
      // 今天
      groups[0].sessions.push(session)
    } else if (sessionDate.getTime() >= sevenDaysAgo.getTime()) {
      // 7天内（不包括今天）
      groups[1].sessions.push(session)
    } else if (sessionDate.getTime() >= thirtyDaysAgo.getTime()) {
      // 30天内（不包括7天内）
      groups[2].sessions.push(session)
    } else {
      // 超过30天
      groups[3].sessions.push(session)
    }
  })

  return groups
})

// 标题截断函数
const truncateTitle = (title: string): string => {
  if (!title) return ''
  if (title.length <= 14) return title
  return title.substring(0, 14) + '...'
}

// 格式化显示时间（用于对话项内显示）
const formatDisplayTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (sessionDay.getTime() === today.getTime()) {
    // 今天：显示时间
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } else {
    // 非今天：显示月日
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    })
  }
}

// 侧边栏收起/展开处理
const handleCollapse = (value: boolean) => {
  collapsed.value = value
}

const handleCreateNew = () => {
  chatStore.createNewSession()
  closeMenu()
}

const handleSwitchSession = (sessionId: string) => {
  if (editingSessionId.value) return
  chatStore.switchSession(sessionId)
  closeMenu()
}

const handleDeleteSession = (sessionId: string) => {
  if (editingSessionId.value === sessionId) {
    handleCancelEdit()
  }
  chatStore.deleteSession(sessionId)
  closeMenu()
}

// 开始编辑
const handleStartEdit = (session: Session) => {
  editingSessionId.value = session.id
  editTitle.value = session.title
  originalTitle.value = session.title
  closeMenu()
}

// 保存编辑
const handleSaveEdit = () => {
  if (editingSessionId.value && editTitle.value.trim()) {
    chatStore.renameSession(editingSessionId.value, editTitle.value.trim())
  }
  editingSessionId.value = null
  editTitle.value = ''
  originalTitle.value = ''
}

// 取消编辑
const handleCancelEdit = () => {
  editingSessionId.value = null
  editTitle.value = ''
  originalTitle.value = ''
}

// 切换菜单显示/隐藏
const toggleMenu = (sessionId: string, event: MouseEvent) => {
  if (activeMenuId.value === sessionId) {
    activeMenuId.value = null
  } else {
    activeMenuId.value = sessionId
    // 下次 DOM 更新后计算位置
    nextTick(() => {
      positionMenu(event)
    })
  }
}

// 计算菜单位置
const positionMenu = (event: MouseEvent) => {
  if (!activeMenuId.value) return

  const menu = document.querySelector(
    `.menu-dropdown[data-menu-id="${activeMenuId.value}"]`,
  ) as HTMLElement
  if (!menu) return

  const button = event.currentTarget as HTMLElement
  const buttonRect = button.getBoundingClientRect()
  const viewportHeight = window.innerHeight

  // 菜单尺寸
  const menuWidth = 120
  const menuHeight = 112 // 两个菜单项 + 分割线的高度

  // 计算水平位置 - 右侧对齐按钮
  let left = buttonRect.right - menuWidth
  // 确保不超出左边界
  if (left < 8) left = 8

  // 计算垂直位置 - 智能判断上下位置
  const spaceBelow = viewportHeight - buttonRect.bottom
  const spaceAbove = buttonRect.top

  let top: number

  if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
    // 下方空间不足，但上方空间足够 - 显示在上方
    top = buttonRect.top - menuHeight - 4
  } else {
    // 显示在下方
    top = buttonRect.bottom + 4
  }

  // 确保不超出视口边界
  if (top < 8) top = 8
  if (top + menuHeight > viewportHeight - 8) {
    top = viewportHeight - menuHeight - 8
  }

  // 应用位置
  menu.style.left = `${left}px`
  menu.style.top = `${top}px`
}

// 关闭菜单
const closeMenu = () => {
  activeMenuId.value = null
}

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  if (!activeMenuId.value) return
  const activeMenu = document.querySelector(`.menu-dropdown[data-menu-id="${activeMenuId.value}"]`)
  if (activeMenu && !activeMenu.contains(event.target as Node)) {
    closeMenu()
  }
}

// 全局点击事件监听
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="scss">
.app-sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8f9fa;
  border-right: 1px solid #e1e5e9;
  transition: all 0.3s var(--n-bezier);

  :deep(.n-layout-sider-scroll-container) {
    display: flex;
    flex-direction: column;
  }
}

// 展开状态样式
.sidebar-expanded {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e1e5e9;
  flex-shrink: 0;
  background: #fff;
  position: relative;

  .header-top {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sidebar-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .new-chat-btn {
    border-radius: 8px;
    height: 36px;
    font-weight: 500;
    font-size: 14px;
    background: #10b981;
    border: none;

    &:hover {
      background: #0d8c6d;
      transform: none;
      box-shadow: none;
    }
  }

  .collapse-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 28px;
    height: 28px;
    color: #666;

    &:hover {
      background: #f0f2f5;
    }
  }
}

.session-list-container {
  flex: 1;
  overflow: hidden;
  background: #f8f9fa;
}

.session-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
}

// 时间分组标题
.time-group-header {
  padding: 8px 12px 4px;
  font-size: 12px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.session-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 2px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  background: #fff;
  min-height: 52px;

  &:hover {
    background: #f0f2f5;
    border-color: #e1e5e9;

    .menu-toggle {
      opacity: 1;
      visibility: visible;
    }
  }

  &--active {
    background: #e6f4ee !important;
    border-color: #10b981 !important;

    .session-title {
      color: #10b981;
      font-weight: 500;
    }

    .session-icon {
      color: #10b981;
    }
  }

  &--editing {
    background: #f0f2f5;
    border-color: #e1e5e9;
  }
}

.session-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.session-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #666;
  flex-shrink: 0;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-header {
  display: flex;
  align-items: center;
  margin-bottom: 2px;

  .edit-input {
    width: 100%;

    :deep(.n-input) {
      border-radius: 4px;
    }
  }
}

.session-title-container {
  min-width: 0;
}

.session-title {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  color: #1a1a1a;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}

.session-time {
  font-size: 12px;
  color: #999;
  line-height: 1.2;
}

// 菜单样式
// 菜单样式
.session-menu {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.menu-toggle {
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  width: 24px;
  height: 24px;

  &:hover {
    opacity: 1;
    visibility: visible;
    background: #e1e5e9;
  }
}

.menu-dropdown {
  position: fixed; /* 改为 fixed 定位 */
  background: #fff;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10000; /* 提高 z-index */
  min-width: 120px;
  padding: 4px;
  /* 移除之前的定位属性 */
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #1a1a1a;

  &:hover {
    background: #f0f2f5;
  }

  &.delete {
    color: #e74c3c;

    &:hover {
      background: rgba(231, 76, 60, 0.1);
    }
  }
}

.menu-divider {
  height: 1px;
  background: #e1e5e9;
  margin: 4px 0;
}

.edit-buttons {
  display: flex;
  gap: 4px;

  .action-btn {
    transition: all 0.2s ease;
    width: 24px;
    height: 24px;

    &:hover {
      transform: scale(1.05);
      background: #e1e5e9;
    }
  }
}
.empty-state {
  margin-top: 80px;
  padding: 0 20px;

  :deep(.n-empty__icon) {
    margin-bottom: 16px;
  }

  :deep(.n-empty__description) {
    margin-bottom: 20px;
    color: #999;
    font-size: 14px;
  }
}

// 收起状态样式（已补充空状态）
.sidebar-collapsed {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 8px;
  align-items: center;
}

.collapsed-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  align-items: center;
}

.collapsed-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;

  .collapsed-new-chat {
    width: 40px;
    height: 40px;
    background: #10b981;
    border: none;

    &:hover {
      background: #0d8c6d;
    }
  }

  .expand-btn {
    width: 40px;
    height: 40px;
    color: #666;

    &:hover {
      background: #f0f2f5;
    }
  }
}

.collapsed-sessions {
  flex: 1;
  width: 100%;

  .collapsed-session-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    padding: 8px 0;
  }

  // 收起状态空状态样式
  .collapsed-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    color: #999;
  }

  .collapsed-session-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #666;

    &:hover {
      background: #f0f2f5;
    }

    &--active {
      background: #e6f4ee !important;
      color: #10a37f;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .app-sidebar {
    width: 100% !important;
    max-width: 100%;
    background: #fff;
  }

  .sidebar-header {
    padding: 12px;

    .sidebar-title {
      font-size: 15px;
    }
  }

  .session-title {
    max-width: 140px;
  }
  .menu-dropdown {
    /* 移动端保持原有底部弹窗样式 */
    position: fixed;
    top: auto !important;
    bottom: 0;
    left: 0 !important;
    right: 0;
    width: 100%;
    border-radius: 12px 12px 0 0;
    margin-top: 0;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    max-width: none;
  }
  // 移动端收起状态
  .sidebar-collapsed {
    padding: 12px 6px;
  }

  .collapsed-actions {
    gap: 8px;

    .collapsed-new-chat,
    .expand-btn {
      width: 36px;
      height: 36px;
    }
  }

  .collapsed-session-item,
  .collapsed-empty {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 480px) {
  .session-list {
    padding: 6px;
  }

  .session-item {
    padding: 8px 10px;
  }

  .session-title {
    max-width: 120px;
    font-size: 13px;
  }

  .session-time {
    font-size: 11px;
  }

  .time-group-header {
    padding: 6px 10px 2px;
    font-size: 11px;
  }

  .sidebar-header {
    padding: 10px;

    .sidebar-title {
      font-size: 14px;
    }

    .new-chat-btn {
      height: 34px;
      font-size: 13px;
    }
  }
}
// 深色模式支持（已补充收起状态空状态）
@media (prefers-color-scheme: dark) {
  .app-sidebar {
    background: #1a1a1a;
    border-right-color: #2a2a2a;
  }

  .sidebar-header {
    background: #1a1a1a;
    border-bottom-color: #2a2a2a;

    .sidebar-title {
      color: #fff;
    }

    .collapse-btn {
      color: #999;

      &:hover {
        background: #2f2f2f;
      }
    }
  }

  .session-list-container {
    background: #1a1a1a;
  }

  .time-group-header {
    color: #999;
  }

  .session-item {
    background: #2a2a2a;

    &:hover {
      background: #2f2f2f;
      border-color: #3a3a3a;
    }

    &--active {
      background: #1e3a2a !important;
      border-color: #10a37f !important;
    }
  }

  .session-title {
    color: #fff;
  }

  .session-time {
    color: #999;
  }

  .menu-dropdown {
    background: #2a2a2a;
    border-color: #3a3a3a;

    &::before {
      background: #2a2a2a;
      border-color: #3a3a3a;
    }
  }

  .menu-item {
    color: #fff;

    &:hover {
      background: #3a3a3a;
    }
  }

  .menu-divider {
    background: #3a3a3a;
  }

  // 收起状态深色模式
  .sidebar-collapsed {
    .collapsed-sessions {
      .collapsed-empty {
        color: #666;
      }

      .collapsed-session-item {
        color: #999;

        &:hover {
          background: #2f2f2f;
        }

        &--active {
          background: #1e3a2a !important;
          color: #10a37f;
        }
      }
    }
  }
}
</style>

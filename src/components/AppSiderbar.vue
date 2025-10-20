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
              <n-icon><AddIcon /></n-icon>
            </template>
            新建对话
          </n-button>
        </div>
        <!-- 收起按钮 -->
        <n-button quaternary circle size="small" class="collapse-btn" @click="collapsed = true">
          <template #icon>
            <n-icon><ArrowIcon /></n-icon>
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
                    <n-icon size="16"><ChatboxOutlineIcon /></n-icon>
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
                  <n-dropdown
                    v-if="editingSessionId !== session.id"
                    trigger="click"
                    placement="bottom-end"
                    :options="menuOptions"
                    @select="(key: string) => handleMenuSelect(key, session)"
                  >
                    <n-button quaternary circle size="tiny" class="menu-toggle">
                      <template #icon>
                        <n-icon size="16"><EllipsisHorizontalIcon /></n-icon>
                      </template>
                    </n-button>
                  </n-dropdown>

                  <!-- 编辑状态按钮 -->
                  <div v-else class="edit-buttons">
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
              <n-icon size="60" :depth="2"><ChatboxOutlineIcon /></n-icon>
            </template>
            <template #extra>
              <n-button size="small" type="primary" @click="handleCreateNew">开启新对话</n-button>
            </template>
          </n-empty>
        </n-scrollbar>
      </div>
    </div>

    <!-- 收起状态 -->
    <div v-else class="sidebar-collapsed">
      <div class="collapsed-content">
        <!-- 顶部按钮区域 -->
        <div class="collapsed-actions">
          <n-tooltip placement="right" trigger="hover">
            <template #trigger>
              <n-button circle type="primary" class="collapsed-new-chat" @click="handleCreateNew">
                <template #icon>
                  <n-icon><AddIcon /></n-icon>
                </template>
              </n-button>
            </template>
            新建对话
          </n-tooltip>
          <n-tooltip placement="right" trigger="hover">
            <template #trigger>
              <n-button circle quaternary class="expand-btn" @click="collapsed = false">
                <template #icon>
                  <n-icon><MenuIcon /></n-icon>
                </template>
              </n-button>
            </template>
            展开边栏
          </n-tooltip>
        </div>

        <!-- 最近对话列表 -->
        <div class="collapsed-sessions">
          <n-scrollbar>
            <div class="collapsed-session-list">
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
import { ref, computed, h } from 'vue'
import { NIcon } from 'naive-ui'

interface Session {
  id: string
  title: string
  createdAt: number
  messages?: unknown[]
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

// 菜单选项
const menuOptions = computed(() => [
  {
    label: '重命名',
    key: 'rename',
    icon: () => h(NIcon, null, { default: () => h(EditIcon) }),
  },
  {
    type: 'divider',
    key: 'd1',
  },
  {
    label: '删除',
    key: 'delete',
    icon: () => h(NIcon, null, { default: () => h(TrashIcon) }),
  },
])

// 计算属性:按时间分组
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

  const sortedSessions = [...sessions.value].sort((a, b) => b.createdAt - a.createdAt)

  sortedSessions.forEach((session) => {
    const sessionDate = new Date(session.createdAt)
    const sessionDay = new Date(
      sessionDate.getFullYear(),
      sessionDate.getMonth(),
      sessionDate.getDate()
    )

    if (sessionDay.getTime() === today.getTime()) {
      groups[0].sessions.push(session)
    } else if (sessionDate.getTime() >= sevenDaysAgo.getTime()) {
      groups[1].sessions.push(session)
    } else if (sessionDate.getTime() >= thirtyDaysAgo.getTime()) {
      groups[2].sessions.push(session)
    } else {
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

// 格式化显示时间
const formatDisplayTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (sessionDay.getTime() === today.getTime()) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } else {
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

// 创建新对话
const handleCreateNew = () => {
  chatStore.createNewSession()
}

const handleSwitchSession = (sessionId: string) => {
  if (editingSessionId.value) return
  chatStore.switchSession(sessionId)
}

// 菜单选择处理
const handleMenuSelect = (key: string, session: Session) => {
  if (key === 'rename') {
    handleStartEdit(session)
  } else if (key === 'delete') {
    handleDeleteSession(session.id)
  }
}

const handleDeleteSession = (sessionId: string) => {
  if (editingSessionId.value === sessionId) {
    handleCancelEdit()
  }
  chatStore.deleteSession(sessionId)
}

// 开始编辑
const handleStartEdit = (session: Session) => {
  editingSessionId.value = session.id
  editTitle.value = session.title
  originalTitle.value = session.title
}

// 保存编辑
const handleSaveEdit = () => {
  if (editingSessionId.value && editTitle.value.trim()) {
    chatStore.renameSession(editingSessionId.value, editTitle.value.trim())
    window.$message?.success('重命名成功')
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
.session-menu {
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
    background: #e1e5e9;
  }
}

.edit-buttons {
  display: flex;
  gap: 4px;

  .action-btn {
    width: 24px;
    height: 24px;

    &:hover {
      background: #e1e5e9;
    }
  }
}

.empty-state {
  margin-top: 80px;
  padding: 0 20px;
}

// 收起状态样式
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
  .session-title {
    max-width: 140px;
  }
}

// 深色模式支持
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

  .sidebar-collapsed {
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
</style>
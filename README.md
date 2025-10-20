# 🤖 AI Talk - 智能对话应用

基于 Vue 3 + Vite + 智谱AI 的现代化智能对话应用。支持流式响应、主题切换、会话管理等功能。

## ✨ 功能特性

- 🎨 **现代化UI设计** - 简洁优雅的用户界面
- 💬 **实时对话** - 支持与智谱AI进行流式对话
- 🌓 **主题切换** - 支持深色/浅色主题切换
- 📝 **会话管理** - 创建、切换、删除对话会话
- 💾 **本地存储** - 会话历史本地持久化
- ⚡ **快速响应** - 基于 Vite 的快速开发体验
- 📱 **响应式设计** - 适配各种屏幕尺寸

## 🛠️ 技术栈

- **前端框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **语言**: TypeScript
- **AI服务**: 智谱AI GLM API
- **样式**: CSS3
- **状态管理**: Vue Reactivity

## 📋 前置要求

- Node.js >= 16.0.0
- npm >= 7.0.0 或 yarn >= 1.22.0
- 智谱AI API 密钥 ([获取地址](https://open.bigmodel.cn/))

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <your-repository-url>
cd ai-talk
```

### 2. 安装依赖

```bash
npm install
```

或使用 yarn:

```bash
yarn install
```

### 3. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# 创建配置文件
touch .env.local
```

添加以下内容：

```env
# 智谱AI API密钥（必填）
VITE_ZHIPU_API_KEY=your_api_key_here

# 可选配置
# VITE_API_TIMEOUT=30000  # API请求超时时间（毫秒）
# VITE_MODEL_NAME=glm-4   # 使用的模型名称
```

**获取 API 密钥步骤：**

1. 访问 [智谱AI开放平台](https://open.bigmodel.cn/)
2. 注册/登录账号
3. 进入「API Keys」管理页面
4. 创建新的 API Key
5. 复制密钥并粘贴到 `.env.local` 文件

### 4. 启动开发服务器

```bash
npm run dev
```

项目将在 `http://localhost:5173` 运行

## 📦 项目结构

```
ai-talk/
├── src/
│   ├── assets/          # 静态资源
│   ├── components/      # Vue 组件
│   │   ├── ChatArea.vue      # 聊天区域组件
│   │   ├── ChatInput.vue     # 输入框组件
│   │   └── Sidebar.vue       # 侧边栏组件
│   ├── utils/          # 工具函数
│   │   └── api.ts      # API 调用封装
│   ├── types/          # TypeScript 类型定义
│   ├── App.vue         # 根组件
│   └── main.ts         # 应用入口
├── public/             # 公共静态资源
├── .env.local         # 环境变量配置（需自行创建）
├── .gitignore         # Git 忽略文件
├── vite.config.ts     # Vite 配置
├── tsconfig.json      # TypeScript 配置
└── package.json       # 项目依赖

```

## 🔧 可用脚本

### 开发模式

```bash
npm run dev
```

启动开发服务器，支持热更新

### 构建生产版本

```bash
npm run build
```

类型检查并编译打包生产版本

### 类型检查

```bash
npm run type-check
```

运行 TypeScript 类型检查

### 代码检查

```bash
npm run lint
```

使用 ESLint 检查代码规范

## ⚙️ 配置说明

### 环境变量

| 变量名 | 说明 | 必填 | 默认值 |
|--------|------|------|--------|
| `VITE_ZHIPU_API_KEY` | 智谱AI API密钥 | ✅ | - |
| `VITE_API_TIMEOUT` | API请求超时时间(ms) | ❌ | 30000 |
| `VITE_MODEL_NAME` | 使用的AI模型 | ❌ | glm-4 |

### 主题配置

应用支持深色/浅色主题切换，主题配置会自动保存到本地存储。

### 会话存储

所有会话数据保存在浏览器的 localStorage 中，包括：
- 会话列表
- 会话消息
- 主题设置

## 🐛 常见问题

### 1. API 401 错误 - "令牌已过期或验证不正确"

**原因**: API 密钥无效或已过期

**解决方案**:
```bash
# 1. 检查 .env.local 文件是否存在
cat .env.local

# 2. 确认密钥格式正确（无多余空格）
# 正确: VITE_ZHIPU_API_KEY=your_key_here
# 错误: VITE_ZHIPU_API_KEY= your_key_here

# 3. 重新获取密钥并更新
# 访问 https://open.bigmodel.cn/ 获取新密钥

# 4. 重启开发服务器（重要！）
npm run dev
```

### 2. 请求超时 - "Request timeout after 30000ms"

**原因**: 网络问题或API响应慢

**解决方案**:
```bash
# 1. 检查网络连接
ping open.bigmodel.cn

# 2. 增加超时时间（在 .env.local 中）
VITE_API_TIMEOUT=60000

# 3. 清理缓存并重启
rm -rf node_modules/.vite
npm run dev

# 4. 检查账户余额是否充足
# 访问 https://open.bigmodel.cn/ 查看余额
```

### 3. 环境变量不生效

**原因**: 修改环境变量后未重启服务器

**解决方案**:
```bash
# 1. 停止当前服务器（Ctrl+C）

# 2. 清理缓存
rm -rf node_modules/.vite

# 3. 重新启动
npm run dev
```

### 4. 构建错误

**解决方案**:
```bash
# 1. 清理依赖
rm -rf node_modules
rm package-lock.json

# 2. 重新安装
npm install

# 3. 重新构建
npm run build
```

### 5. 流式响应中断

**原因**: 网络不稳定或响应解析错误

**解决方案**:
- 检查网络连接稳定性
- 查看浏览器控制台错误日志
- 尝试刷新页面重新连接

## 🔒 安全注意事项

⚠️ **重要提示**:

1. **永远不要将 `.env.local` 提交到 Git**
   ```bash
   # .gitignore 应包含:
   .env.local
   .env.*.local
   ```

2. **不要在前端代码中硬编码 API 密钥**
   ```typescript
   // ❌ 错误做法
   const apiKey = "sk-xxxxxxxxxx";
   
   // ✅ 正确做法
   const apiKey = import.meta.env.VITE_ZHIPU_API_KEY;
   ```

3. **生产环境使用环境变量管理**
   - 使用服务器环境变量
   - 或使用密钥管理服务

4. **定期更换 API 密钥**

5. **监控 API 使用量和费用**

## 📊 性能优化

- ✅ 使用 Vite 实现快速冷启动
- ✅ 按需加载组件
- ✅ 流式响应减少等待时间
- ✅ 本地存储减少重复请求
- ✅ 代码分割优化加载速度

## 🌐 浏览器支持

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

## 📄 许可证

[MIT License](LICENSE)

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交 [Issue](https://github.com/your-repo/issues)
- 发送邮件到: 3427713698@qq.com

## 🙏 鸣谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [智谱AI](https://open.bigmodel.cn/) - 强大的AI能力支持

---

**⭐ 如果这个项目对你有帮助，请给它一个 Star！**

*最后更新: 2025年10月*

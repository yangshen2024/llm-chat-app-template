# Chat · AI 工作空间

在原 Cloudflare Workers AI 模板上迭代的 ChatGPT 风格界面。独立项目，非 OpenAI 官方产品。

## 启动

```bash
npm ci
npm run dev
```

默认地址 http://localhost:8787。真实模型使用 Cloudflare Workers AI，需登录有 AI 权限的 Cloudflare 账户（`npx wrangler login`），调用可能产生费用。顶部选择「离线演示」可测试界面而不调用模型；演示不会伪装成真实答案。也可用任意静态服务器提供 `public/` 来测试演示模式。

```bash
npm run check       # TypeScript + Worker 部署 dry-run，不发布
npm run test:stream # SSE 分片、UTF-8、JSON、空响应和错误测试
npm run deploy     # 由项目所有者部署到 Cloudflare
```

## 目录与组件

| 文件 | 职责 |
| --- | --- |
| public/index.html | 侧边栏、模型选择、欢迎页、消息流、输入框、设置/搜索弹窗 |
| public/styles.css | 响应式布局、明暗主题、移动端抽屉 |
| public/chat.js | 会话管理、本地保存、搜索、生成/停止/重试状态、离线演示 |
| public/stream.js | SSE 分段缓冲、UTF-8 解码、JSON 回退和错误处理 |
| src/index.ts | `/api/chat`、输入验证、模型白名单、Workers AI 流式调用 |
| src/types.ts | Worker 环境与消息类型 |
| wrangler.jsonc | 现有 Cloudflare 部署配置 |
| test/stream.test.mjs | 无额外依赖的流式解析回归测试 |

## 已支持

- 新建、切换、搜索和删除对话；浏览器本地持久化。
- Enter 发送，Shift+Enter 换行；中文输入法合成保护；自动调整输入框高度。
- 等待、流式生成、停止、失败、重新生成、复制回复。
- Llama 3.3 / 明确标注的离线演示；模型选择实际决定请求路径。
- 浅色/深色主题、探索灵感、设置、清除历史；移动端侧边栏。
- 使用 textContent 展示内容，避免将用户或模型内容当作 HTML 执行。

## 待决定的差异

1. 当前保持现有 Llama 3.3 后端。若需要 GPT、Claude 或其他模型，需选择提供商并在服务端配置密钥。
2. 当前为中文 ChatGPT 风格布局；若要按特定版本逐像素还原，请指定桌面/移动端参考截图。
3. 对话仅存当前浏览器，未接入登录、云同步、附件、语音、联网搜索和订阅计费。
4. 消息按纯文本安全展示，尚未添加 Markdown、代码高亮和公式渲染。
5. 不预置虚构的个人聊天历史。搜索可检索用户在该项目中实际创建的对话。

## 验证与部署边界

自动测试覆盖网络分片和错误处理，`npm run check` 验证类型和 Worker 打包。真实模型端到端调用需要所有者的 Cloudflare 账户。此分支不修改线上部署；通过 PR 审阅后可按原流程部署。

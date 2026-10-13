# Workbench Agent Instructions

个人自用的 Nuxt 4 书签、笔记与记账应用：单用户密码登录，书签页为书签树 + Chat 面板，笔记页为单列笔记卡片列表，记账页为按天分组的流水列表；书签节点及空白区域、笔记卡片及空白区域、记账行及空白区域均通过右键打开上下文菜单。

技术栈：Nuxt 4、Nuxt UI v4、Nuxt Hub、Drizzle ORM + SQLite/Cloudflare D1、Tailwind CSS v4、TypeScript 6、AI SDK（`ai` / `@ai-sdk/*` / `@comark/nuxt`）。个人自用、单用户、单浏览器。

- 纯客户端渲染（`nuxt.config.ts` 设 `ssr: false`）：不写 SSR 分支（`import.meta.server`），也不要指望服务端取数；`selfFetch` 的 401 跳转用 `navigateTo`（带 `redirect` 查询参数回登录页）。客户端渲染仍会由服务端渲染 app shell，所以页面请求走 Nuxt 渲染器。

## 功能

- **F1 登录**：单用户密码（环境变量 `NUXT_AUTH_PASSWORD`，即 `runtimeConfig.authPassword`）；校验通过后用 Nuxt 4.6 的 `useSession`（`nuxt/server`）写入 `nuxt-session` cookie（默认 httpOnly/secure/sameSite=lax，maxAge 1 天），密封用 Nuxt 的应用密钥 `NUXT_APP_SECRET`（≥32 字符，session 内部经 `deriveSecret` 读取）；除 `/api/auth/` 外所有 API 由 `server/middleware/auth.ts` 用 `getSession` 校验；CSRF 防护依赖该 cookie 的 `sameSite=lax`（跨站 POST 不带 cookie），不要改成 `none`。
- **F2 书签数据**：一次拉全量，`sortBookmarks` 排序后 `buildTree` 组成单树——文件夹在上（各带子书签），根级书签按 position 落在最下边。
- **F3 双栏与节点菜单**：节点右键打开操作菜单，节点链接隐藏默认尾随箭头；`md` 起左栏（35%）是书签树、右栏（65%）是 Chat（`ChatPanel`），窄屏（`md` 以下）隐藏右栏、书签树占满整宽；书签树区域铺满高度、空白处右键新建（文件夹/书签），无底部新建虚拟项。两栏（含弹窗）在首次 `GET /api/bookmarks` 返回后才一起渲染（`v-if="data"`）——否则右栏 Chat 会先出现、左栏书签树随后补上，两栏显示不同步；判定用 `data` 而不是 `status`，刷新时旧数据还在、不会整页闪。
- **F4 新建/编辑**：书签、文件夹各一个 create/edit 双模式弹窗；新建位置由服务端在 `POST /api/bookmarks` 计算（见「排序模型」），提交带 `submitting` 守卫防重复提交。
- **F5 删除**：非空文件夹拒绝删除；删除后同组剩余项整段重编号。
- **F6 移动**：Up / Down（同级一步）、To Top / To Bottom（同级首尾，整组一次重编号）、To Folder（跨父级，`MoveFormModal` 选目标父级，落到目标分组末尾）收在节点菜单的 **Move 二级菜单**里；分组首尾时对应子项 disabled，请求在途时整个 Move 菜单 disabled。
- **F7 排序位置模型**：见「前端架构约定」的「排序模型」「重编号实现」。
- **F8 请求与错误**：`selfFetch` 请求错误弹英文 toast，401 跳登录；`useSelfFetch` 是其 `useFetch` 封装。
- **F9 数据库**：见「数据库」；**F10 部署/备份**：见「部署」；**F11 工程配置与技能**：见「命令」「约束」「项目技能」。
- **F13 笔记**：每条笔记含标题（`title`）、正文（`content`）与书写日期（`writtenAt`，表单默认今天、可改）；`/notes` 是居中单列的卡片列表（四周留白由默认布局给），按书写日期倒序分组——每天一张 `UCard`（header 是日期、body 是当天笔记，行只显示标题），组顺序与组内顺序都来自服务端；空白处右键新建（无独立按钮），行左键进编辑、右键编辑/删除（无只读详情弹窗），删除不弹确认框；卡片样式见「Nuxt UI」。
- **F14 记账**：`/expenses` 是仅含「消费日期 / 金额 / 消费内容」三项的流水列表，按 `spentAt` 倒序，先按月分段（每月一张 `UCard` 显示该月合计），月内再按本地日期分成多张 `UCard`（header 显示日期与小计，body 是当天流水行）；消费只精确到天，表单用 `DatePicker` 选日期（存当天本地零点的毫秒时间戳）；金额以整数「分」存储（`amount`），界面出入都经 `formatAmount` / `parseAmount` 换算，不做元的浮点运算；空白处右键新建，行左键进编辑、右键编辑/删除，删除不弹确认框；滚动区 `h-full overflow-y-auto` 并用 Tailwind 内置的 `scrollbar-none` 隐藏滚动条，外层留白由默认布局给）。
- **F15 Chat**：书签页右栏是 `ChatPanel`（`useChat`（`@ai-sdk/vue`）+ `DefaultChatTransport`（`ai`）驱动 `POST /api/chat` 流式）。可选模型不向 provider 拉取，由环境变量 `NUXT_PUBLIC_CHAT_MODELS`（`{ label, value }` 的 JSON 数组）配置（即 `runtimeConfig.public.chatModels`，`nuxt.config.ts` 里只留空数组占位；示例见 `.env.example`）。`POST /api/chat` 用 `@ai-sdk/openai-compatible` 的 `streamText`，带 `getTime` 工具（`server/utils/ai-tools/`，见 F16 / F17）、`stopWhen: isLoopFinished()`（工具循环跑到自然终止：模型返回的 finish reason 不再是 `tool-calls` 即停。**注意别删掉 `stopWhen`**——SDK 默认是 `isStepCount(1)`，只跑一步、连最终答案都没有）和 `smoothStream`（`Intl.Segmenter('zh')` 按词平滑）；工具调用用官方最简的 `UChatTool` 显示——只传 `:text="getToolName(part)"` 与 `:streaming="isToolStreaming(part)"`，**不给默认插槽**（组件的 `hasContent = !!slots.default`，没有插槽时触发器 disabled、不显示 chevron，就是一行紧凑的工具状态、streaming 时 shimmer），**刻意不展示工具输入/输出**：不维护「工具名 → 标题/图标」映射，也不渲染 `part.input` / `part.output` 的 JSON；assistant 文本用 `@comark/nuxt` 的 `<Markdown>` 渲染（用户文本仍为纯文本）。provider 走 `runtimeConfig.chatBaseUrl` / `chatApiKey`（env `NUXT_CHAT_BASE_URL` / `NUXT_CHAT_API_KEY`，nuxt.config 不留默认值）——**任何 OpenAI 兼容端点都能用**，换 provider 只改这两个 env + `NUXT_PUBLIC_CHAT_MODELS`（模型 ID 必须是该 provider 的写法），代码不用动。当前指向 commandcode（`https://api.commandcode.ai/provider/v1`，模型 ID 是对方的 slug，如 `gpt-6-luna` / `zai-org/GLM-5.3` / `moonshotai/Kimi-K3`；该端点会按账号套餐拦截，报 403 `MODEL_NOT_IN_PLAN` 就是套餐不含该模型）。备选是 Cloudflare Workers AI 的 OpenAI 兼容端点（`https://api.cloudflare.com/client/v4/accounts/<account_id>/ai/v1`，token 用带「Workers AI」权限的 Cloudflare API Token，**不要用 `npx wrangler auth token` 的 OAuth token**、会过期；模型写 `@cf/...` 全名，走每天 10,000 Neurons 的免费额度，但 `kimi-k2.x` / `glm-5.x` / `deepseek-v4-*` 等前沿模型必须付费）。没有消息时右栏显示 `ChatPlaceholder`（打字机输出的假「思考」+「余额不足，请充值。」），有真实消息后切换为真实对话。
- **F16 AI 工具（通用只读查询）**：`server/utils/ai-tools/` 一个工具一个文件、`index.ts` 汇总成 `aiTools`；除 `getTime` 外还有 `queryDatabase(sql)`——模型自己写 SQL，工具只放行单条只读语句：先要求以 `SELECT` / `WITH` 开头（去掉尾部 `;` 后仍含 `;` 即判为多语句并拒绝），再剥掉字符串字面量 / 注释后扫 `INSERT` / `UPDATE` / `DELETE`（`REPLACE INTO` 单独判——`REPLACE(...)` 是常用字符串函数，不能整词拉黑）——**`WITH ... DELETE/UPDATE/INSERT` 是 SQLite 合法的单条写语句，只靠「以 `WITH` 开头」拦不住，所以必须有这层扫描**（保留 `WITH` 是为了让模型用递归 CTE 遍历 `parentId` 书签树，用纯 `SELECT` 做不到）；把 `db.all()` 结果先按 200 行、再按 20000 字符截断返回（任一处截断都置 `truncated`）；`description` 里写清表结构与关键语义（金额是「分」、日期是 `Asia/Shanghai` 当天零点的毫秒数、书签按 `(parentId, type)` + `position` 排序），并明确要求「聚合 / 搜索 / 排序 / 日期分桶都在 SQL 里算，不要把原始行拉回来自己算」（如金额用 `SUM(amount) / 100.0`、搜索用 `LIKE`、按月用 `strftime`），改表结构时要同步维护。SQL 由模型生成、语法错是常态，所以**只有这个工具刻意用 `try/catch` 把错误信息回传给模型自纠**，不违反 fail-loudly 约定（其余业务代码仍不写 `try/catch`）。
- **F17 AI 写入工具（新增）**：`server/utils/ai-tools/` 另有三个**只做新增**的工具——`insertBookmark`（仅书签，不含文件夹；`parentId` 可选，须为已有文件夹 id，模型先用 `queryDatabase` 查）、`insertNote`、`insertExpense`。三者刻意拆开而不是合并成一个万能写工具（写入比查询风险高、独立收口），且都只插入，不提供编辑 / 移动 / 删除（要改让用户去界面）。`amount` 传「元」（小数，服务端 `Math.round(x * 100)` 存分），日期传 `"YYYY-MM-DD"`（缺省今天）。服务端日期换算在 `server/utils/datetime.ts`：按固定 `+8` 偏移算 `Asia/Shanghai` 当天零点（服务器跑在 UTC，不能复用客户端 `app/utils/datetime.ts`）。三个插入逻辑抽在 `server/utils/{bookmark-create,note-create,expense-create}.ts`，与 REST API 的 POST 共用——`createBookmark` 内含 `parentId` 校验（必须为 null 或已存在的文件夹，否则插入孤儿行会让 `buildTree` 抛错、书签页白屏）与 `max(position) + 1` 位置计算。不加 `toolApproval`，靠「独立工具 + 服务端校验」控风险。

## 目录职责

- `app/pages/`：`bookmarks.vue`（书签树 + Chat，35/65 分栏）、`notes.vue`（单列卡片列表）、`expenses.vue`（记账流水）、`login.vue`；`index.vue` 重定向 `/bookmarks`（`nuxt.config.ts` 的 routeRules 同款）。
- `app/layouts/`：`default.vue`（页面外壳：满高 + 四边留白 + 统一渲染 `PageNav`）；`app.vue` 用 `<NuxtLayout>` 包 `<NuxtPage>`。
- `app/components/`：`BookmarkFormModal`、`FolderFormModal`、`MoveFormModal`、`NoteFormModal`、`ExpenseFormModal`、`ChatPanel`、`ChatPlaceholder`、`PageNav`、`LoginForm`。
- `app/composables/`：数据 `useBookmarks` / `useNotes` / `useExpenses`，弹窗状态 `*Form`，删除 `useDelete*`，排序 `useReorderBookmarks`，右键菜单 `*Menu`，各自独立、互不混合。
- `app/utils/`：`selfFetch` / `useSelfFetch`（请求与错误）、`bookmark-tree`（排序/组树）、`bookmark-menu`（书签与文件夹共用的 Move 子菜单）、`money`（分与元的换算）、`datetime`（日期/月份显示格式、「YYYY-MM-DD」↔ 当天零点毫秒时间戳的互转）。
- `server/`：`api/{auth,bookmarks,chat,notes,expenses}`、`utils/{renumber,bookmark-group,datetime,bookmark-create,note-create,expense-create,ai-tools}`、`db/schema.ts` 与 `db/migrations/sqlite/`。
- `shared/types/`：前后端共享类型（`db.ts`）。

## 命令

| 命令               | 说明                           |
| ------------------ | ------------------------------ |
| `pnpm dev`         | 启动开发服务器                 |
| `pnpm build`       | 构建生产版本                   |
| `pnpm preview`     | 预览构建结果                   |
| `pnpm lint`        | ESLint 检查                    |
| `pnpm lint:fix`    | ESLint 自动修复                |
| `pnpm typecheck`   | TypeScript 类型检查            |
| `pnpm generate:db` | Drizzle 数据库迁移生成         |
| `pnpm backup`      | 导出远程 D1 到 db.sql          |
| `pnpm deploy`      | 部署到 Cloudflare Workers + D1 |

- 包管理器为 `pnpm`（锁定在 pnpm-lock.yaml，workspace 配置在 pnpm-workspace.yaml）
- `pnpm-workspace.yaml` 启用 `trustPolicy: no-downgrade`：Nuxt 的 `@nuxt/vite-builder` 依赖 `cssnano ^9`，而 cssnano 9 / postcss-* 家族换发布流程后只剩 provenance、没有 npm trusted-publisher 证据，会被该策略判为 trust downgrade 并中断安装，故在 `trustPolicyExclude` 里按包名（`cssnano*`、`postcss-*`、`stylehacks`、`css-declaration-sorter`）排除；以后升级这些包若再报 `ERR_PNPM_TRUST_DOWNGRADE`，按同样方式补排除项
- `pnpm dev` 启动后支持 HMR，修改前端代码无需重新构建或重启；脚本带 `--no-tui`，关掉 Nuxt 4.6（`@nuxt/cli` 4.x）的 `dev` 默认交互式 TUI，改用普通流式日志（临时想看 TUI 可直接跑 `nuxt dev`）
- 本地密钥配置在 `.env`（已被 gitignore，模板见 `.env.example`）：`NUXT_AUTH_PASSWORD`（登录密码）、`NUXT_APP_SECRET`（≥32 字符随机串，Nuxt 应用密钥，用于密封 session）；Chat 另有 `NUXT_CHAT_BASE_URL`（任意 OpenAI 兼容端点）、`NUXT_CHAT_API_KEY`（该 provider 的密钥）、`NUXT_PUBLIC_CHAT_MODELS`（见 F15）
- 无测试框架，无 CI 配置

## API 要点

路由按 Nuxt 文件路由落在 `server/api/**`（文件名即方法与路径），可自行查看；只有下列边界不明显：

- 除 `/api/auth/*` 外所有 API 都需登录（`server/middleware/auth.ts`）。
- `reorder` / `move` 是静态路由，优先于 `[id]` 动态路由匹配。
- `PUT /api/bookmarks/move`：`db.batch()` 里「源分组重编号 → 更新 parentId → 目标分组重编号」原子完成，目标分组写最后（所以同父级移动也正确）；400 拒绝 parentId 等于自身、id 不存在、把文件夹移进自己的子孙。
- `DELETE /api/bookmarks/:id`：删除与同组剩余项重编号在同一个 `db.batch()` 里原子完成。
- `PUT /api/bookmarks/reorder`：不校验 ids 覆盖度，由调用方保证传完整分组（见「重编号实现」）。
- `PUT /api/bookmarks/:id`：只更新 `name` / `url`；`type` / `parentId` / `position` 是结构性字段，分别由创建、`move`、`reorder` 维护，编辑接口不动它们。
- `POST /api/bookmarks`：薄封装，调用 `server/utils/bookmark-create.ts` 的 `createBookmark`（与 AI 的 `insertBookmark` 共用）——校验 `parentId` 必须为 `null` 或已存在的文件夹（否则 400），并按目标 `(parentId, type)` 分组算 `position = max(position) + 1`（空分组为 1），客户端不提交 `position`。
- `GET /api/bookmarks`：按 `(parentId, type, position)` 返回，顺序自洽；客户端仍以 `sortBookmarks` 为准，不依赖该顺序。
- `POST` / `PUT /api/notes` 的 `writtenAt` 由客户端提交（表单默认今天，`dateKeyToMs` 存当天本地零点的毫秒时间戳），服务端不再写 `Date.now()`。
- `PUT /api/notes/:id` 三个字段（title/content/writtenAt）都可改（补记、改书写日期）；`DELETE /api/notes/:id` 不做存在性预检（删 0 行，幂等）。
- `expenses` 的 CRUD 与 notes 同形；`GET /api/expenses` 按 `spentAt DESC, id DESC` 返回，`PUT /api/expenses/:id` 三个字段都可改（补记/改时间）。
- `POST /api/notes` / `POST /api/expenses` 同样是薄封装，分别调用 `server/utils/{note-create,expense-create}.ts`（与 AI 的 `insertNote` / `insertExpense` 共用）；日期换算见「数据库」的 `server/utils/datetime.ts`。
- `POST /api/chat`：body 是 `{ messages, model }`，返回 `createUIMessageStreamResponse` 的流式响应；没有 models 端点，模型列表由前端读 `runtimeConfig.public.chatModels` 得到（见 F15）。

## 数据库

- 开发环境使用本地 SQLite（由 `@nuxthub/core` 自动处理），文件位于 `.data/db/sqlite.db`，无需配置环境变量
- 生产环境为 Cloudflare D1：构建时 `NITRO_PRESET=cloudflare_module` 使 `hub.db` 自动切换 `d1` driver
- D1 绑定在 `wrangler.jsonc` 中通过 `database_name` 按名声明（binding 名 `DB`，无需维护 UUID），构建时 nitro 合并进 `.output/server/wrangler.json`，并由 `@nuxthub/core` 自动补充 `migrations_table`/`migrations_dir`
- D1 binding 模式（driver `d1`）不需要 `NUXT_HUB_CLOUDFLARE_*` 环境变量（那是 `d1-http` driver 才需要）
- Drizzle Kit 无独立配置文件，由 `@nuxthub/core` 自动处理
- 迁移文件位于 `server/db/migrations/sqlite/`
- 日期的存储约定是「`Asia/Shanghai` 当天零点的毫秒时间戳」；服务端跑在 UTC，换算在 `server/utils/datetime.ts`（固定 `+8`，中国无夏令时）——客户端的 `app/utils/datetime.ts` 用的是浏览器时区，两者不可互相复用

### 表结构：bookmarks

| 字段     | 类型    | 说明                      |
| -------- | ------- | ------------------------- |
| id       | integer | 主键，自增                |
| parentId | integer | 父文件夹 ID（可空）       |
| type     | text    | 'folder' 或 'bookmark'    |
| name     | text    | 名称（必填）              |
| url      | text    | 书签 URL（bookmark 类型） |
| position | integer | 排序位置                  |

历史分组的 position 可以有偏移或间隙；删除或移动后，目标 `(parentId, type)` 分组会归一化为 `1..n`。

### 表结构：notes

| 字段      | 类型    | 说明                                                   |
| --------- | ------- | ------------------------------------------------------ |
| id        | integer | 主键，自增                                             |
| title     | text    | 笔记标题（必填，纯文本）                               |
| content   | text    | 笔记正文（必填，纯文本保留换行）                       |
| writtenAt | integer | 书写日期，存当天本地零点的毫秒时间戳（默认今天，可改） |

没有 `position`：列表顺序完全由 `writtenAt`（书写日期）决定，不需要书签那套分组重编号。

### 表结构：expenses

| 字段    | 类型    | 说明                                 |
| ------- | ------- | ------------------------------------ |
| id      | integer | 主键，自增                           |
| item    | text    | 消费内容（必填）                     |
| amount  | integer | 金额，整数「分」（不是元）           |
| spentAt | integer | 消费日期，存当天本地零点的毫秒时间戳 |

`amount` 存分是为了避开 SQLite `real` 的 IEEE754 浮点误差（`0.1 + 0.2` 不精确），累加小计才可靠。没有 `category` / `note` / `position`：当前只记三项，列表顺序由 `spentAt` 决定。

## 前端架构约定

- **删除刷新时序**：`useDeleteBookmark` / `useDeleteFolder` / `useDeleteNote` / `useDeleteExpense` 都在 DELETE 成功后立即调用传入的 `refresh()`（不 await），随后提示成功；即「删除类 composable 统一收一个 `refresh` 回调」。
- **文案语言与页面导航**：所有页面的菜单、弹窗、提示等界面文案统一使用英文（Toast 也是英文，`selfFetch` 的错误提示见 F8）；代码注释仍用中文。`PageNav`（`fixed bottom-4 right-4` 的竖排 `UNavigationMenu`，列出三个页面并自动高亮当前页）统一由默认布局渲染，页面不再自己写导航
- **页面外壳（默认布局）**：`app/layouts/default.vue` 统一给页面「满高 + 四边留白」并渲染 `PageNav`；`app.vue` 用 `<NuxtLayout>` 包 `<NuxtPage>`。留白移动端为 `px-4 py-4`、`md` 起为 `px-[25vw] py-[10vh]`（`h-screen`）；页面内容根元素自己写 `h-full`（`h-screen` 已在布局上）；`login` 也用默认布局（内容居中），`index` 用 `definePageMeta({ layout: false })` 不套外壳（它只做重定向）
- **弹窗操作按钮**：所有弹窗的操作按钮统一放在 `UModal` 的 `#footer`、右对齐，外层固定用 `<div class="flex justify-end gap-2 w-full">`。表单弹窗的按钮不在 `<UForm>` 内，所以不用 `type="submit"`，而是给 `UForm` 挂 `ref="formRef"`（`const formRef = useTemplateRef<{ submit: () => Promise<void> }>('formRef')`），footer 的按钮用 `@click="formRef?.submit()"`——`UForm.submit()` 会先跑校验再触发 `@submit`，校验链路（如书签/文件夹的 `:validate`）不受影响。登录页的 `UAuthForm` 提交按钮是整行宽（`block`），不在此列。移动弹窗（`MoveFormModal`）没有校验、不套 `UForm`，footer 按钮直接 `@click="handleSubmit"`
- **笔记页按天分组**：`/notes` 是 `h-full overflow-y-auto scrollbar-none` 的滚动区 + `space-y-6`（留白交给默认布局），页面用 `toDateKey(writtenAt)` 把笔记按本地日期分组（与记账页共用 `datetime` 工具），每组一张 `UCard`（header 是 `formatDateKey` 的日期、body 是当天的笔记行），组顺序与组内顺序都顺着 `GET /api/notes` 的 `writtenAt DESC`，页面不做客户端排序
- **笔记列表只给标题、正文只在弹窗里**：每天卡片里的行只放标题（`truncate` 单行截断），不放正文预览（曾经的 `max-h-40` 截断预览已去掉）；正文只在点行打开的新建/编辑弹窗里显示与修改。这样列表保持简洁，长文也不会把卡片撑高
- **笔记行的右键定位**：笔记行是页面自己渲染的 DOM，直接挂 `data-note-id`，`@contextmenu` 里用 `closest('[data-note-id]')` 反查记录；**不要照搬书签树的 token class 方案**——那是 `UTree` 只透传 `item.class`、不转发任意属性导致的变通。`closest` 取不到就是空白处 → 根级菜单（新建笔记）。右键处理器里**不能 `event.stopPropagation()`**：Reka 的 ContextMenuTrigger 要靠事件冒泡到触发元素才会在指针位置打开菜单
- **笔记弹窗**：新建/编辑共用 `NoteFormModal`，`title`、`writtenAt`（书写日期）、`content` 都是必填 `UFormField`（footer 的 Save 在 title/content 都非空时才可用），`writtenAt` 用共用的 `DatePicker` 组件（见「Nuxt UI」）；`content` 的 `UTextarea` 固定 `:rows="20"`（配 `:ui="{ base: 'resize-none' }"`、不加 `autoresize`），内容超出后文本框自己出滚动条。左键点行即进编辑（与右键菜单的 Edit 同一入口）
- **删除一律不弹确认框**：书签 / 文件夹 / 笔记 / 记账都是菜单项一点即删，没有确认弹窗、也没有撤销——个人自用项目刻意保持简单；删除菜单项统一用 `color: 'error'` + `i-lucide-trash-2`（标红）
- **笔记顺序只由服务端给**：`writtenAt` 是用户可改的书写日期（表单默认今天、存当天本地零点），顺序完全取自 `GET /api/notes` 的 `ORDER BY writtenAt DESC, id DESC`，页面不做客户端排序（书签那套 `sortBookmarks` 是 position 模型专用的）
- **单一职能 + 依赖注入**：数据（`useBookmarks` / `useNotes` / `useExpenses`）、弹窗状态（`*Form`）、删除（`useDelete*`）、排序（`useReorderBookmarks`）、菜单（`*Menu`）各自独立、互不混合；书签与文件夹的弹窗状态形状相同，共用 `useBookmarkForm`（页面按用途各实例化一份），移动弹窗状态独立成 `useMoveForm`。页面（`bookmarks.vue`）实例化 composable 后以参数注入菜单（如 `useFolderMenu(bookmarkForm, folderForm, removeFolder, reorder)`），菜单内部不自行实例化状态类 composable
- **排序模型**：分组键为 `(parentId, type)`，同组内 `sortBookmarks` 恒定「文件夹优先」→「position 升序」，因此 UI 中一段连续可视区间恰好等于一个分组。客户端排序是唯一权威（`tree` 经 `sortBookmarks`），不依赖 `GET /api/bookmarks` 的返回顺序。移动**只做整段重编号**（按新顺序把 position 写回 `1..n`），**永不交换 position 值**——历史数据的 position 是全局计数器留下的，可能带偏移和间隙，交换语义未定义且无法自愈。新建位置由服务端计算：`POST /api/bookmarks` 写入前取目标 `(parentId, type)` 分组的 `max(position) + 1`（空分组为 1），客户端不再计算或提交 `position`；编辑不改 `position`。历史数据无需预先迁移，删除或移动时会将目标分组整段归一化为 `1..n`
- **重编号实现**：必须走 `server/utils/renumber.ts` 的 `renumberGroupQuery(parentId, type, orderedIds)`，它用 SQLite JSON1 的 `json_each` 把顺序当参数传入，**语句数恒为 1、绑定参数为常数个且最多 4 个，与分组大小 N 无关**。不要改回「每行一条 UPDATE」（随 N 线性增长，会撞 D1 每批语句数限制），也不要改成「单条 CASE」（要 2N 个绑定参数，会撞 D1 每查询 100 个绑定参数的限制）。**调用方必须传入该分组的完整成员**——服务端不做覆盖度校验，漏传的行不会被更新
- **移动能力查询成本**：`useReorderBookmarks` 的 `located` computed 预先构造 `id → { item, group, index }` 映射，`locate` 只做 Map 查找。不要在 `canMove` / `locate` 内重排或扫描全量数据；以往扫描造成的约 16ms/次开销是优化此处的原因。
- **移动的两条通道**：同父级内走 `PUT /api/bookmarks/reorder`（`useReorderBookmarks` 负责）；跨父级走 `PUT /api/bookmarks/move`，由 `MoveFormModal` 自己发请求（与 `BookmarkFormModal` / `FolderFormModal` 一致：弹窗发请求 + `emit`，页面在 `@moved` 上 `refresh`），所以 `useReorderBookmarks` 里没有跨父级的函数。
- **四个同级移动共用一套逻辑**：`move(id, direction)` / `canMove(id, direction)` 的 direction 是 `up | down | top | bottom`——「走一格」和「到首/尾」只是**目标下标**不同（`{ up: index - 1, down: index + 1, top: 0, bottom: group.length - 1 }`），所以没有单独的 `moveToEdge` / `canMoveToEdge`，也**不要用循环调 `move` 来实现移到首/尾**（一次整组重编号即可）。`move` 开头会先 `canMove` 一次：已在两端时 `up` 会算出 `target = -1`，而 `splice(-1, 0, id)` 会把它插到倒数第二位、静默写坏顺序。
- **节点菜单的 Move 是共用的二级菜单**：`app/utils/bookmark-menu.ts` 的 `moveMenuItem(bookmark, reorder, moveForm)` 返回一个带 `children` 的子菜单项，同时给书签菜单和文件夹菜单用（各写一份会随项数增加越来越难同步）；菜单直接收 `Bookmark` 记录（页面右键时解析节点 id、从 `data` 里 find 出记录再交给菜单）。一级菜单因此只有 4~5 项。整个 Move 在请求在途时 disabled，子项各自的 `canMove` 判定照旧。
- **菜单分节统一**：所有右键菜单都是 `DropdownMenuItem[][]`，约定为「上面一组放**全部非删除项**，最下面单独一组只放 `Delete`（`color: 'error'` + `i-lucide-trash-2`）」，两组之间即分隔线；不要把 Delete 和其它项混在同一组（`useBookmarkMenu` / `useFolderMenu` / `useNoteMenu` / `useExpenseMenu` 都按此写）。
- **跨父级移动的目标候选**：页面用 `buildFolderTree(data, item)` 算出文件夹树（只含文件夹、按层级嵌套、同级按 position），注入 `MoveFormModal`；「根级」是弹窗自己补在最前面的虚拟节点（`value: null`）。传进去的是即将被移动的那条记录，util 内部只剪掉**它自己**：子孙只在从被保留的节点往下递归时才被访问，所以天然进不来——不剪则会成环，`buildTree` 里成环的行都成不了 root，整棵子树从界面消失且再也点不到；服务端在 `move.put.ts` 里也会再拒一次。
- **错误处理（fail loudly）**：`selfFetch` 已在全局统一弹出错误 toast，业务代码**不写 try/catch 包裹请求**；失败时异常自然传播（unhandled rejection 即预期表现），成功路径（emit/refresh/toast）不执行

## Nuxt UI

- 图标使用 `@iconify-json/lucide` 集，格式如 `i-lucide-*`
- 主题定制入口为 `app/app.config.ts`（`defineAppConfig`）；当前只覆写一处：`ui.formField.slots.error = 'hidden'`（见下）
- **表单校验不显示报错文字**：`UFormField` 的报错 div 只在出错时渲染（`FormField.vue` 里 `data-slot="error"` 的 `v-if`），出现/消失会撑高弹窗、输入时来回跳动。所以在 `app.config.ts` 里把 `ui.formField.slots.error` 覆写成 `'hidden'`：`validate` 照旧拦截提交、无效字段照旧变红（`useFormField` 的 `color: 'error'`/`highlight`），只是不再显示文字，必填只靠 `required` 的星号。新增表单不用再单独处理
- 项目实际使用的组件：`UApp`、`UModal`、`UForm`、`UTree`、`UDropdownMenu`、`UContextMenu`、`UInput`、`UInputDate`、`UTextarea`、`UCard`、`UButton`、`UFormField`、`UAuthForm`、`UPopover`、`UCalendar`、`USelect`、`UNavigationMenu`、`UChatMessages`、`UChatPrompt`、`UChatPromptSubmit`、`UChatReasoning`、`UChatTool`；另有项目组件 `DatePicker`（包 `UInputDate` + `UPopover` + `UCalendar`，见下）
- **日期选择器 `DatePicker`（记账页 / 笔记页共用）**：`app/components/DatePicker.vue` 把 `UInputDate` + 尾部日历按钮 + `UPopover` + `UCalendar` 封成一个只收发 `YYYY-MM-DD` 字符串的组件，表单里写 `<DatePicker v-model="formState.xxx" />` 即可；`:reference` 用包住 `UInputDate` 的 `<div ref="dateField" class="inline-block">` 定位——不要用 `inputsRef[3]`（那是内部某一段，弹窗会压在输入框上），也不要用组件的 `$el`（实测弹出的位置跑到视口外）；`:content="{ side: 'right', align: 'start', sideOffset: 8 }"` 让日历弹在整个输入框右侧而不是正下方（空间不够时 Reka 会自动翻到左侧）。`UInputDate` 空值用 `null`、`UCalendar` 用 `undefined`，两种空值差异在组件内部各配一个 computed 消化掉、共用同一份字符串；日期对象来自 `@internationalized/date`（`UInputDate`/`UCalendar` 的 peer 依赖，已在 `dependencies` 声明）
- 记账页的分组列表用 `UCard`：日期与小计放进 `#header`（`root` 的 `divide-y` 自动分隔 header 与 body）；`:ui` 里 `root: 'ring-inset'`、`body: 'p-0 divide-y divide-default'`（`divide-y` 落在 body 的直接子元素即各行上承接分隔线），header 的主题内边距（`p-4 sm:px-6`）按需覆盖——注意 `sm:px-*` 要单独再覆盖一次才会在 sm 断点生效，只写 `p-0` 会残留主题的 `sm:px-6`；`ring-inset` 则避免描边被滚动容器（`overflow-y-auto` 会把 `overflow-x` 连带变成 `auto`）裁掉。笔记页也按天分组用 `UCard`：header 放日期、body 用 `divide-y` 分隔当天的笔记行，`:ui` 与记账页同款（`root: 'ring-inset'`）。不要手写 `ring-default` / `bg-default` 这类语义色 class 去拼表面
- `UTree` 没有拖拽能力（底层 Reka `TreeRoot` 亦无），排序只用右键菜单的移动项实现
- 书签页的 `UTree` 传 `size="xl"`（文字 `text-base`、图标 `size-6`，比默认 `md` 大一圈）；`treeLinkUi` 只覆盖选中样式，不含尺寸
- **`UTree` 单选时 `modelValue` 收的是 item 对象本身**（Reka 内部用 `getKey` 比较，不比较引用），传对应节点对象进去就有主题默认的选中样式（`selected` 变体给的是 `before:bg-elevated` 底色 + `text-highlighted`，hover 还有 `hover:before:bg-elevated/50`）。选中样式统一由 `ui.link` 覆盖决定，两处不一样：书签页的树是导航，`treeLinkUi` 把底色和文字色一起去掉（`hover:text-inherit hover:before:bg-transparent before:bg-inherit text-inherit`）；移动弹窗是选择器，底色同样去掉，但**必须留一个选中标记**，所以多了 `aria-selected:text-primary`（选中行文字变主题色、其余行 `text-inherit`，悬停不上色以免和选中混淆）——`aria-selected` 是 UTree/Reka 打在节点上的，不需要额外 data 属性。两份 `ui` 各写一遍、不抽常量。书签页隐藏 `linkTrailingIcon` 是去掉导航箭头；移动弹窗也隐藏它，因为那棵树不折叠（见下一条）
- **点击 `UTree` 节点会同时触发选中与折叠/展开**（Reka `TreeItem` 的 onClick 先 select 再 toggle），没有单独的展开按钮。移动弹窗那棵树只用来选目标：把 `expanded` 做成**受控值**（`collectExpanded` 收集所有文件夹的 key），点击时 Reka 发出的 `update:expanded` 不采纳，所以**点一下只选中、不会折叠**，所有文件夹保持展开；再配 `ui.linkTrailingIcon: 'hidden'` 隐藏展开/折叠箭头。另外单选默认 `selectionBehavior: 'toggle'`（重复点同一项会取消选中）——那会造成「高亮没了、但 `formState.target` 还留着」的不一致，所以移动弹窗设 `selection-behavior="replace"`，点同一个文件夹仍保持选中
- **`UTree` 的 `get-key` 会被塞一个空对象**：Reka 用 `getKey(modelValue ?? {})` 探测「当前没有选中」，所以 `get-key` 必须对 `{}` 也安全——`bookmarks.vue` 写成 `String(item.id)`（`String(undefined)` 无害）。**不要在 `get-key` 里对节点做多一层取值**（如 `item.xxx.id`）：`{}` 上没有 `xxx`，会在树挂载时抛 `Cannot read properties of undefined`、**整页白屏**（这个坑真踩过一次）
- **`UDropdownMenu` 的 item 带 `children` 就渲染成二级菜单**（内部是 `DropdownMenu.Sub` / `SubTrigger`，自带右侧箭头，`SubTrigger` 上的 `disabled` 会连子菜单一起禁用，子项的 `onSelect` 照常生效）。鼠标悬停由 `pointermove` + 100ms 定时器触发打开；`UContextMenu` 走的是同一个 content 组件，所以右键菜单里也能用子菜单
- **弹窗尺寸按需在实例上写 `ui`**：`UModal` 没有 `size` 之类的 prop，宽度只能由 `ui.content` 覆盖（主题默认 `max-w-lg`，512px）；表单/删除弹窗都用默认值，移动弹窗传 `:ui="{ content: 'max-w-2xl' }"`（672px，候选树宽一点更好读）、笔记的新建/编辑弹窗传 `max-w-4xl`（896px，长文输入更舒服）。移动弹窗的候选树容器是 `max-h-96`（384px）：候选树是整棵展开的（本地数据实测内容高约 1100px），再高会顶到弹窗自身的视口上限，超出部分由容器自己滚动。`ui.content` 与主题里的 `max-w-lg` 冲突由 tailwind-merge 解决，主题的 `bg-default` / `rounded-lg` / `ring` 等类都保留
- Toast 通过 Nuxt UI 的 `useToast()` composable 调用，没有直接渲染 `UToast` 组件

## 项目技能

- `skills-lock.json` 锁定 `nuxt-ui`、`cloudflare`、`wrangler` 三个项目技能，安装内容位于 `.agents/skills/`
- Nuxt UI 组件、表单和界面任务使用 `nuxt-ui` 技能
- Cloudflare Workers/D1 开发使用 `cloudflare` 技能；运行或修改 Wrangler 命令前使用 `wrangler` 技能

## 部署

- 使用 Cloudflare Workers + D1 部署
- worker 名由 `wrangler.jsonc` 的 `name` 决定（现为 `workbench`）
- `wrangler.jsonc` 设 `workers_dev: false`、`preview_urls: false`，不对外暴露 `*.workers.dev` 地址（因此需要自定义域名 / route 才能访问）
- D1 绑定在 `wrangler.jsonc` 中声明，构建时 nitro 合并到 `.output/server/wrangler.json`
- 部署命令 `pnpm deploy` 通过 `cross-env` 跨平台设置 `NITRO_PRESET=cloudflare_module`，然后执行：构建 Nitro preset `cloudflare_module` → `wrangler deploy --keep-vars` → 应用 D1 迁移（`wrangler --config .output/server/wrangler.json d1 migrations apply DB --remote`）
- `wrangler deploy` 从根目录运行，经构建生成且已被 gitignore 的 `.wrangler/deploy/config.json` 重定向到 `.output/server/wrangler.json`；迁移命令需显式 `--config .output/server/wrangler.json`（`migrations_dir` 为相对该文件的 `db/migrations/sqlite/`）
- 部署前提：wrangler 已认证（`wrangler login`，或设置 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` 环境变量）
- 生产密钥：`wrangler secret put NUXT_AUTH_PASSWORD`（登录密码）与 `wrangler secret put NUXT_APP_SECRET`（≥32 字符随机串，可用 `openssl rand -base64 32` 生成）；两者与本地 `.env` 的值独立，`--keep-vars` 不会覆盖 secrets。旧的 `AUTH_SECRET` 可 `wrangler secret delete AUTH_SECRET` 删除。Chat 同理：`wrangler secret put NUXT_CHAT_API_KEY`（provider 密钥）；`NUXT_CHAT_BASE_URL` / `NUXT_PUBLIC_CHAT_MODELS` 按需设为 secret 或 var
- `pnpm backup` 导出远程 D1 到 `db.sql`（已被 gitignore），经 binding `DB` 从根 `wrangler.jsonc` 解析库名，不依赖构建产物

## 约束

- 这是个人自用项目：单用户、单浏览器操作，数据来源和使用流程都在自己掌控内。按现有代码的写法实现，**不要为假想场景增加防御代码、重复校验、无意义的状态分支或多余的 `try/catch`**；只在真实的外部边界处理错误。
- 优先使用现有技术栈和模块，在现有文件中完成修改；保持实现简单、直接、可读，优先让正常流程直观，不为小功能增加额外抽象、通用层或复杂架构。
- 遵循现有命名、目录职责和数据流，不擅自改变已有 API、配置字段或模块边界。
- **自动导入**：`app/composables/*`、`app/utils/*`、`app/components/*`、`server/utils/*`、`shared/types/*` 的类型、`@nuxthub/db` 的 `db`/`schema` 都由 Nuxt 自动导入，直接用即可，**不要写重复的显式 import**。例外是服务端事件工具（`defineEventHandler`/`readBody`/`createError`/`getRequestURL`/`useSession`/`getSession`/`useRuntimeConfig`）：必须从 `nuxt/server` 显式导入——h3 的同名自动导入与 `nuxt/server` 混用会报 `NUXT_E8012`，且 `event` 形状、`useRuntimeConfig` 签名都不同。
- 页面请求优先走 `selfFetch` / `useSelfFetch`；样式使用 Tailwind class 与 Nuxt UI 的 `ui` 属性。
- `try/finally` 是允许的：它没有 `catch`，不吞异常，仅用于复位状态（如 `moving`、`submitting`），不违反 fail-loudly 约定。
- ESLint 使用 `@antfu/eslint-config`（已启用 formatters 与 vue 规则），不支持 Prettier（`.vscode/settings.json` 已禁用）；style/format 类规则与引号、分号由 ESLint 自动修复，保存时自动执行。
- 每次修改代码后必须执行 `pnpm lint` 和 `pnpm typecheck`，不得新增错误。
- 禁止使用 `pnpm lint:fix`；只用 `pnpm lint` 检查，并且只修复本次修改相关代码的错误。
- **代码修改后必须同步更新本文件**：新增、修改或删除文件时（组件、composable、页面、API、工具函数、配置等），立即更新**功能**、**目录职责**、**API 要点**等对应章节，确保文档始终反映最新代码。
- 不将构建产物、缓存、依赖与本地数据纳入 Git（`.output`、`.nuxt`、`.data`、`node_modules`、`.env`、`db.sql`、`.wrangler`）。

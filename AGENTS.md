# Workbench Agent Instructions

个人自用的 Nuxt 4 应用：单用户密码登录；书签页 = 书签树 + Chat，笔记页 = 按书写日期分组的卡片，记账页 = 按月/按天分组的流水；节点、行与空白处都用右键菜单。技术栈：Nuxt 4、Nuxt UI v4、Nuxt Hub、Drizzle + SQLite/D1、Tailwind v4、TypeScript 6、AI SDK。

> 本文件只写两类东西：**必须遵守的约束**，以及**决策点与理由**（为什么用这个、为什么不用那个）。页面结构、组件用法、API 行为、表结构、目录清单都能读代码得到，不在这里复述；改动代码时按需读源码。所以本文件的更新时机是「新增/改变约束，或做了新的取舍」，而不是「改了代码」。

## 核心约束

- **纯客户端渲染**（`nuxt.config.ts` 设 `ssr: false`）：不写 SSR 分支（`import.meta.server`）、不指望服务端取数；`selfFetch` 的 401 跳转用 `navigateTo`（带 `redirect` 查询参数回登录页）。
- **个人自用、单用户、单浏览器**：按现有写法实现，不为假想场景加防御代码、重复校验、无意义状态分支或多余 `try/catch`；只在真实外部边界（请求、AI 生成物、用户输入）处理错误。
- 优先用现有技术栈、在现有文件里改；保持简单直接可读，**不为小功能加抽象层、通用层或架构**。
- 遵循现有命名、目录职责与数据流；不擅自改已有 API、配置字段或模块边界。
- **自动导入**：`app/composables/*`、`app/utils/*`、`app/components/*`、`server/utils/*`、`shared/types/*` 的类型与 `@nuxthub/db` 的 `db` / `schema` 直接用，不写重复 import。唯一例外是服务端事件工具（`defineEventHandler` / `readBody` / `createError` / `getRequestURL` / `useSession` / `getSession` / `useRuntimeConfig`）：必须从 `nuxt/server` 显式导入，与 h3 同名自动导入混用会报 `NUXT_E8012`。
- **模板只能引用 `script` 里出现过的标识符**：只写在模板里的自动导入工具函数会被 vue-tsc 当成组件属性，报 `Property 'formatAmount' does not exist on type 'ComponentPublicInstance<...>'`（`nuxt typecheck` 会失败，但运行时不报错，因为构建期的模板自动导入仍会注入）。所以模板专用逻辑要在 `script` 里收口，例如 `const money = (cents: number) => \`¥${formatAmount(cents)}\``，不要直接在模板里调自动导入的工具函数。
- 页面请求走 `selfFetch` / `useSelfFetch`；样式用 Tailwind class 与 Nuxt UI 的 `ui` 属性。
- 界面文案（菜单/弹窗/Toast）用英文，代码注释用中文。
- **任何代码修改之后都必须执行 `pnpm lint` 与 `pnpm typecheck`**，哪怕只改一行、只改一个字符串；不得新增错误，并在回复里说明两条命令的结果（通过，或剩余错误是什么）。没跑就不算改完。
- **禁止 `pnpm lint:fix`**——只用 `pnpm lint` 检查，且只修复本次改动相关代码的错误。
- 不把构建产物、缓存、依赖与本地数据纳入 Git（`.output`、`.nuxt`、`.data`、`node_modules`、`.env`、`db.sql`、`.wrangler`）。

## 决策点

### 渲染与取数

- **不用 SSR**：单用户自用，没有 SEO / 首屏指标要求，服务端取数只会平添分支；代价是首屏要等客户端请求，所以页面外壳的留白与 loading 由默认布局统一兜住。
- **书签页两栏在 `GET /api/bookmarks` 与 `GET /api/chat/models` 都返回后才一起渲染**（`v-if="data && chatModels"`，不用 `status`）：否则 Chat 右栏先出现、书签树后补上，两栏不同步，Chat 的模型下拉还要从空再补一跳；用 `data` 判定还能让刷新时旧数据继续显示、不整页闪。**代价是模型接口失败时（provider 挂了 / 没配 key）整页白屏**，而书签数据其实已经拿到；要放宽就把判定写成 `data && (chatModels || chatModelsError)`。
- **模型列表在页面里请求、以 prop 传给 `ChatPanel`**：`ChatPanel` 挂在 `v-if` 之内，请求写在它里面要等书签返回、组件挂载后才发出，首屏从 `max(书签, 模型)` 退化成两者相加；页面 setup 在 `v-if` 之外，两个请求才并发。**别把 `useSelfFetch('/api/chat/models')` 挪回 `ChatPanel`**。
- **`selfFetch` / `useSelfFetch` 而不是裸 `$fetch`**：401 跳登录与错误 toast 只有一处实现，业务代码拿到的语义统一。
- **fail loudly，不写 `try/catch` 包请求**：`selfFetch` 已全局弹错误 toast，异常自然传播（unhandled rejection 即预期表现），成功路径（emit / refresh / toast）就不会执行；`try/finally` 允许，因为它不吞异常、只用于复位 `moving` / `submitting` 这类状态。
- **唯一刻意的例外是 AI 的 `queryDatabase`**：SQL 由模型生成、语法错是常态，必须用 `try/catch` 把错误回传给模型自纠。

### 认证

- **用 Nuxt 4.6 的 `useSession` 写 `nuxt-session` cookie**（httpOnly/secure/sameSite=lax，maxAge 1 天），密封用应用密钥 `NUXT_APP_SECRET`（≥32 字符）：不自己造 token 与签名逻辑，`server/middleware/auth.ts` 一处校验除 `/api/auth/*` 外的全部 API。
- **CSRF 防护依赖 `sameSite=lax`**（跨站 POST 不带 cookie）：不要改成 `none`——单用户应用没有额外的 CSRF token 机制，改了就等于所有写接口裸奔。

### 书签排序模型

- **分组键是 `(parentId, type)`，`sortBookmarks` 是唯一权威**：组内恒定「文件夹优先 → `position` 升序」，所以 UI 里一段连续可视区间恰好等于一个分组；`GET /api/bookmarks` 的返回顺序只是顺便自洽，客户端不依赖它。
- **移动只做整段重编号（写回 `1..n`），永不交换 position 值**：历史 position 来自全局计数器，可能带偏移和间隙，交换语义未定义且无法自愈。新建位置由服务端取目标分组 `max(position) + 1`（空分组为 1），客户端不计算、不提交；编辑不动 `position`。因此历史数据不需要预先迁移。
- **重编号必须走 `server/utils/renumber.ts` 的 `renumberGroupQuery`**（SQLite JSON1 的 `json_each` 把顺序当参数传入）：语句数恒为 1、绑定参数最多 4 个，与分组大小无关。不改成「每行一条 UPDATE」（随 N 线性增长，撞 D1 每批语句数限制），也不改成「单条 CASE」（要 2N 个绑定参数，撞 D1 每查询 100 个绑定参数限制）。代价是**调用方必须传该分组的完整成员**——服务端不做覆盖度校验，漏传的行不会被更新。
- **四个同级移动共用一个 `move(id, direction)`**（`up | down | top | bottom`），差别只是目标下标：不单独加 `moveToEdge`，也不用循环调 `move` 实现首尾（一次整组重编号即可）。`move` 开头先 `canMove`：已在两端时 `splice(-1, 0, id)` 会插到倒数第二位、静默写坏顺序。
- **移动的两条通道**：同父级走 `PUT /api/bookmarks/reorder`；跨父级走 `PUT /api/bookmarks/move`（`db.batch()` 里「源组重编号 → 更新 parentId → 目标组重编号」原子完成，目标组写最后，所以同父级移动也正确）。`reorder` / `move` 是静态路由，优先于 `[id]`。
- **跨父级候选树用 `buildFolderTree(data, item)`**：util 只剪掉「它自己」，子孙天然进不来；不剪会成环，而成环的行在 `buildTree` 里都成不了 root，整棵子树从界面消失且再也点不到。服务端 `move.put.ts` 再拒一次（自身、不存在、移进自己的子孙）。
- **`createBookmark` 校验 `parentId` 必须是 `null` 或已存在的文件夹**：孤儿行会让 `buildTree` 抛错、书签页白屏。

### 数据存储

- **日期一律存「`Asia/Shanghai` 当天零点的毫秒时间戳」**，服务端换算固定在 `server/utils/datetime.ts`（固定 `+8`，中国无夏令时）：服务器跑在 UTC，不能复用客户端 `app/utils/datetime.ts`（那是浏览器时区），两个文件**不可互相复用**。
- **金额存整数「分」**，界面出入经 `formatAmount` / `parseAmount`：不做元的浮点运算，避开 SQLite `real` 的 IEEE754 误差，小计累加才可靠。
- **`notes` / `expenses` 没有 `position`**：列表顺序完全交给 `writtenAt` / `spentAt`（倒序），不需要书签那套分组重编号。写入时间由客户端或 AI 工具传值，服务端不写 `Date.now()`。
- **删除不做存在性预检**（删 0 行、幂等），也不弹确认框、没有撤销：个人自用刻意保持简单；删除菜单项统一 `color: 'error'` + `i-lucide-trash-2`。

### 类型与跨端契约

- **判定规则：按「谁要看见」放，不按「谁先写的」放。** 跨 HTTP 边界的契约进 `shared/types/`；只在服务端存在的进 `server/`（上游 provider 响应、AI 工具入参、SQL 细节）；只在客户端的视图模型留 `app/`（`FolderNode`、`MoveDirection`、`DeltaChunk`）。
- **读类型不再写显式泛型**：`routeTypedFetch` 让 `useSelfFetch('/api/bookmarks')` 的 `data` 直接从服务端 handler 的返回值推出来（`SerializeObject<Bookmark>[] | undefined`），服务端改字段就会在这里报错。写成 `useSelfFetch<Bookmark[]>(...)` 是**断言而不是校验**：它覆盖推断，还会顺手关掉该次调用的路径 / method 检查（实测 `{ method: 'DELETE' }` 带泛型不报错、不带泛型报错）。只有响应形状与视图类型确实不同时才用泛型——本项目没有。
- **写类型在 `shared/types/db.ts` 命名一次**（`CreateBookmarkInput` / `UpdateBookmarkInput` / `MoveBookmarkInput` / `ReorderBookmarksInput` / `SaveNoteInput` / `SaveExpenseInput`）：请求体推不出来（写接口 handler 没有返回值），字段清单必须手写，那就只写这一份，别再各处 `Pick<InsertX, ...>`。`{ body }` 声明喂给 Nuxt 的路由类型生成器，前端 `selfFetch` 才会按它校验 body；第二个 `void` 是返回值——不写会退化成 `any`。
- **例外是 `nuxt/server` 版的 `defineEventHandler`**（`login.post.ts` / `chat/index.post.ts`）：它只收返回值类型，声明不了 body；换成 h3 版会让 `useSession` 收到不可移植的 event（NUXT_E8012）。所以这两个接口的 body 前端不校验（登录表单 / AI SDK 自己拼的 body，已接受）。
- **`useSelfFetch` 必须用对象形式**（`createUseFetch({ $fetch: selfFetch })`）：回调形式在 `routeTypedFetch` 下会把工厂的请求形状推断成「所有路由 body 的并集」，`createUseFetch` 自身报错、`data` 跟着退化成 `unknown`。
- **`experimental.routeTypedFetch` + `strictRouteTypes` 常开**：前者把请求形状从 handler 声明推断到前端，后者让拼错的路径、路径与 method 不匹配直接报错；`routeTypedFetch` 在 Nuxt 5 会默认开启。代价是 `$fetch` / `useFetch` 不再接受 `params`（本项目不用）。

### AI（Chat 与工具）

- **Chat 只有两个配置**（`NUXT_CHAT_BASE_URL` + `NUXT_CHAT_API_KEY`）：任何 OpenAI 兼容端点都能用，换 provider 不改代码。
- **拉 `/models` 必须在服务端代理**（`/api/chat/models`）：请求要带 `chatApiKey`，而 `runtimeConfig.public` 会打进客户端产物。
- **必须保留 `stopWhen: isLoopFinished()`**：SDK 默认是 `isStepCount(1)`，只跑一步、连最终答案都没有。
- **不给流式加服务端「平滑」transform**（曾经的 `smoothStream` 已删）：逐 chunk 加工在 Workers 上每个 chunk 都有固定 CPU 开销，中文会被切上千个 chunk，线上直接撞 `exceededCpu`（实测 2s CPU / 68s 墙钟、对话流到一半被终止；本地/Node 没有 CPU 计量，不复现）。让 provider 的分片直接透传，打字机效果只在客户端做（`app/utils/chat-smooth.ts`）。
- **`queryDatabase` 只放行单条只读语句**：要求以 `SELECT` / `WITH` 开头、去掉尾分号后不含 `;`，再剥掉字符串字面量/注释扫 `INSERT` / `UPDATE` / `DELETE`（`REPLACE INTO` 单独判——`REPLACE(...)` 是常用字符串函数，不能整词拉黑）。**保留 `WITH` 是有意的**（模型要用递归 CTE 遍历 `parentId` 书签树），而 `WITH ... DELETE/UPDATE/INSERT` 是 SQLite 合法的单条写语句，所以必须有这层扫描。
- **写入工具拆成三个、只做新增**（`insertBookmark` / `insertNote` / `insertExpense`）：不合并成万能写工具、不提供编辑/移动/删除、不加 `toolApproval`——写入风险高，靠「独立收口 + 服务端校验」控风险；插入逻辑抽在 `server/utils/{bookmark-create,note-create,expense-create}.ts` 与 REST 的 POST 共用，避免两套实现漂移。
- **`queryDatabase` 的 `description` 是给模型看的 schema 文档**：写清表结构、金额是分、日期是 `Asia/Shanghai` 零点毫秒、书签按 `(parentId, type)` + `position` 排序，并要求聚合/搜索/排序/日期分桶都在 SQL 里算（`SUM(amount) / 100.0`、`LIKE`、`strftime`）；**改表结构时要同步维护**。

### UI（Nuxt UI / Reka）

- **报错文字统一隐藏**（`app.config.ts` 的 `ui.formField.slots.error = 'hidden'`）：报错 div 出现/消失会撑高弹窗、输入时来回跳动；`validate` 照旧拦提交、无效字段照旧变红，必填只靠星号，新增表单不用单独处理。
- **`UTree` 的 `get-key` 必须对 `{}` 安全**（Reka 用 `getKey(modelValue ?? {})` 探测未选中）：写成 `String(item.id)`，**不要在 `get-key` 里对节点做多层取值**（如 `item.xxx.id`）——会在树挂载时抛错、**整页白屏**。
- **选中样式统一由 `ui.link` 决定**：书签页的树是导航，底色和文字色一起去掉；移动弹窗是选择器，必须留一个选中标记（`aria-selected:text-primary`）。两份 `ui` 各写一遍、不抽常量，因为两处约束不同。
- **移动弹窗把 `expanded` 做成受控值 + `selection-behavior="replace"`**：点击 `UTree` 节点会同时选中并折叠（Reka 的 onClick 先 select 再 toggle），受控后点一下只选中、所有文件夹保持展开；默认 `toggle` 会取消选中，造成「高亮没了但 `formState.target` 还在」的不一致。
- **右键处理器不能 `event.stopPropagation()`**：Reka 的 `ContextMenuTrigger` 要靠事件冒泡到触发元素才会在指针位置打开菜单。笔记行用 `data-note-id` + `closest` 反查，不照搬书签树的 token class 方案（那是 `UTree` 只透传 `item.class` 的变通）。
- **`DatePicker` 封成只收发 `YYYY-MM-DD` 字符串的组件**：`:reference` 用包住 `UInputDate` 的 `<div>`，不用内部 `inputsRef[...]`（弹窗会压在输入框上）、也不用组件 `$el`（位置跑到视口外）；`UInputDate` 空值 `null`、`UCalendar` 空值 `undefined`，差异在组件内各配一个 computed 消化。
- **弹窗按钮统一放 `UModal` 的 `#footer`、右对齐**；表单弹窗的按钮不在 `UForm` 内，所以不用 `type="submit"`，而是 `formRef?.submit()` 触发校验链路。`UModal` 没有 `size` prop，宽度只能用 `ui.content` 覆盖（主题默认 `max-w-lg`），冲突交给 tailwind-merge。
- **菜单分节统一约定**：所有右键菜单都是「上面一组放全部非删除项、最下面单独一组只放 `Delete`」，两组之间就是分隔线；Delete 不与其它项混组。
- **记账/笔记的 `UCard` 分组用 `root: 'ring-inset'` + `body: 'p-0 divide-y divide-default'`**：`ring-inset` 避免描边被滚动容器裁掉，分隔线落在 body 的直接子元素上；覆盖 header 内边距时 `sm:px-*` 要单独再覆盖一次。不手写 `ring-default` / `bg-default` 这类语义色 class 拼表面。滚动条统一用 Tailwind 内置 `scrollbar-none` 隐藏（滚动能力仍在）；Toast 用 `useToast()`。

## 命令

| 命令               | 说明                           |
| ------------------ | ------------------------------ |
| `pnpm dev`         | 启动开发服务器                 |
| `pnpm build`       | 构建生产版本                   |
| `pnpm preview`     | 预览构建结果                   |
| `pnpm lint`        | ESLint 检查                    |
| `pnpm typecheck`   | TypeScript 类型检查            |
| `pnpm generate:db` | Drizzle 数据库迁移生成         |
| `pnpm backup`      | 导出远程 D1 到 db.sql          |
| `pnpm deploy`      | 部署到 Cloudflare Workers + D1 |

- 包管理器 `pnpm`；无测试框架、无 CI 配置（`pnpm lint` + `pnpm typecheck` 就是全部校验）。
- `pnpm dev` 带 `--no-tui`：关掉 Nuxt 4.6 dev 的交互式 TUI，改用普通流式日志；前端改动有 HMR，不用重启。
- 本地密钥在 `.env`（已 gitignore，模板 `.env.example`）：`NUXT_AUTH_PASSWORD`（登录密码）、`NUXT_APP_SECRET`（≥32 字符，密封 session）、`NUXT_CHAT_BASE_URL`、`NUXT_CHAT_API_KEY`。
- `pnpm-workspace.yaml` 用 `trustPolicyIgnoreAfter: 1440` 而不是逐个列 `trustPolicyExclude`：只对发布不满 1440 分钟的新版本做 trust 校验，绕过 cssnano / postcss-* 家族换发布流程造成的 no-downgrade 误报（该值只能是整数分钟，写 `1d` 会报 `invalid u64`）。`minimumReleaseAgeExclude` 列本次升级引入的新版本以绕过发布等待期，配 `minimumReleaseAgeExcludePrune: true` 让 pnpm 自动清理失效条目、不用手工维护名单。

## 部署（Cloudflare Workers + D1）

- `pnpm deploy` 一条链：`NITRO_PRESET=cloudflare_module` 构建 → `wrangler deploy --keep-vars` → `wrangler --config .output/server/wrangler.json d1 migrations apply DB --remote`。迁移命令必须显式 `--config`（`migrations_dir` 相对该文件解析）；worker 名与 D1 绑定（按 `database_name`，不用维护 UUID）都在 `wrangler.jsonc`，构建时 nitro 合并到 `.output/server/wrangler.json`。
- `workers_dev` / `preview_urls` 都是 `false`：不对外暴露 `*.workers.dev`，需要自定义域名 / route 才能访问。
- 生产密钥用 `wrangler secret put`（`NUXT_AUTH_PASSWORD`、`NUXT_APP_SECRET`、`NUXT_CHAT_API_KEY`；`NUXT_CHAT_BASE_URL` 按需 secret 或 var）：与本地 `.env` 独立，`--keep-vars` 不覆盖 secrets。前提是 wrangler 已认证（`wrangler login` 或 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`）。
- **CPU 限制（踩过一次）**：Workers Free 每请求只有 10ms CPU（Paid 默认 30s，`limits.cpu_ms` 最多 5 分钟；Free 上写该字段部署报 error 100328）。结论是流式端点不做服务端逐 chunk 加工（见上）。排查入口：Workers Logs 的 `cpu_time_ms` / `outcome`，或 dashboard 的 Metrics → Errors → Invocation Statuses 里的 `Exceeded CPU Time Limits`。
- 开发用本地 SQLite（`.data/db/sqlite.db`，`@nuxthub/core` 自动处理、无需环境变量），生产 D1 由 `NITRO_PRESET=cloudflare_module` 让 `hub.db` 切到 `d1` driver；d1 binding 模式不需要 `NUXT_HUB_CLOUDFLARE_*`（那是 `d1-http` driver 才需要）。Drizzle Kit 无独立配置，迁移文件在 `server/db/migrations/sqlite/`。
- `pnpm backup` 经 binding `DB` 从根 `wrangler.jsonc` 解析库名导出远程 D1 到 `db.sql`（已 gitignore），不依赖构建产物。

## 项目技能

`skills-lock.json` 锁定、装在 `.agents/skills/`：界面/组件/表单任务用 `nuxt-ui`；Cloudflare Workers/D1 开发用 `cloudflare`；运行或修改 wrangler 命令前用 `wrangler`。

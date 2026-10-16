# Workbench Agent Instructions

个人自用的 Nuxt 4 应用：单用户密码登录；书签页 = 书签树 + Chat，笔记页 = 按书写日期分组的卡片，记账页 = 按月/按天分组的流水；节点、行与空白处都用右键菜单。技术栈：Nuxt 4、Nuxt UI v4、Nuxt Hub、Drizzle + SQLite/D1、Tailwind v4、TypeScript 6、AI SDK、comark 渲染 Chat 正文。

> 本文件只写三类东西：**必须遵守的约束**、**决策点与理由**（为什么用这个、为什么不用那个）、**命令与环境事实**。页面结构、组件用法、API 行为、表结构、目录清单都能读代码得到，不在这里复述，改动代码时按需读源码。
>
> **维护时机**：每次改动后判断一次本次是否产生了新的约束、取舍或环境事实，有就在同一次改动内写进来（能并进已有条目就并，不新开条目），没有就不动本文件。判断标准是「这条以后还能约束别人吗」——答不上来就留在代码里。

## 核心约束

- **纯客户端渲染**（`nuxt.config.ts` 的 `ssr: false`）：不写 SSR 分支、不指望服务端取数；`selfFetch` 的 401 跳转用 `navigateTo`（带 `redirect` 查询参数回登录页）。代价是首屏要等客户端请求，期间页面是空的（没有骨架屏），留白由默认布局的 padding 提供。
- **个人自用、单用户、单浏览器**：不为假想场景加防御代码、重复校验、无意义状态分支或多余 `try/catch`；只在真实外部边界（请求、AI 生成物、用户输入）处理错误。
- **优先在现有技术栈与现有文件里改**：遵循现有命名、目录职责与数据流；不为小功能加抽象层、通用层或架构；不擅自改已有 API、配置字段或模块边界。
- **自动导入**：`app/composables/*`、`app/utils/*`、`app/components/*`、`server/utils/*`、`shared/types/*` 的类型与 `@nuxthub/db` 的 `db` / `schema` 直接用，不写重复 import。唯一例外是服务端事件工具（`defineEventHandler` / `readBody` / `createError` / `getRequestURL` / `useSession` / `getSession` / `useRuntimeConfig`）：必须从 `nuxt/server` 显式导入，与 h3 同名自动导入混用会报 `NUXT_E8012`。
- **模板只能引用 `script` 里出现过的标识符**：只写在模板里的自动导入工具函数会被 vue-tsc 当成组件属性，报 `Property 'formatAmount' does not exist on type 'ComponentPublicInstance<...>'`（`nuxt typecheck` 会失败，但运行时不报错，因为构建期的模板自动导入仍会注入）。所以模板专用逻辑要在 `script` 里收口，例如 `const money = (cents: number) => \`¥${formatAmount(cents)}\``。
- 页面请求走 `selfFetch` / `useSelfFetch`；样式用 Tailwind class 与 Nuxt UI 的 `ui` 属性。
- **不写代码注释**：取舍与理由写进本文件（所以本文件是唯一需要维护的说明）；界面文案（菜单/弹窗/Toast）与 AI 工具说明用英文。
- **任何代码修改之后都必须执行 `pnpm lint` 与 `pnpm typecheck`**，哪怕只改一行、只改一个字符串；不得新增错误，并在回复里说明两条命令的结果（通过，或剩余错误是什么）。没跑就不算改完。
- **禁止 `pnpm lint:fix`**——只用 `pnpm lint` 检查，且只修复本次改动相关代码的错误。
- 不把构建产物、缓存、依赖与本地数据纳入 Git（`.output`、`.nuxt`、`.data`、`node_modules`、`.env`、`db.sql`、`.wrangler`）。

## 决策点

### 渲染与取数

- **书签页两栏在 `GET /api/bookmarks` 与 `GET /api/chat/models` 都返回后才一起渲染**（`v-if="data && chatModels"`，不用 `status`）：否则 Chat 右栏先出现、书签树后补上，两栏不同步，Chat 的模型下拉还要从空再补一跳；用 `data` 判定还能让刷新时旧数据继续显示、不整页闪。**代价是模型接口失败时（provider 挂了 / 没配 key）整页白屏**，而书签数据其实已经拿到；要放宽就把判定写成 `data && (chatModels || chatModelsError)`。
- **模型列表在页面里请求、以 prop 传给 `ChatPanel`**：`ChatPanel` 挂在 `v-if` 之内，请求写在它里面要等书签返回、组件挂载后才发出，首屏从 `max(书签, 模型)` 退化成两者相加；页面 setup 在 `v-if` 之外，两个请求才并发。**别把 `useSelfFetch('/api/chat/models')` 挪回 `ChatPanel`**。
- **`selfFetch` / `useSelfFetch` 而不是裸 `$fetch`**：401 跳登录与错误 toast 只有一处实现，业务代码拿到的语义统一（还有 `useSelfFetch` 为什么必须用对象形式，见「类型与跨端契约」）。
- **fail loudly，不写 `try/catch` 包请求**：`selfFetch` 已全局弹错误 toast，异常自然传播（unhandled rejection 即预期表现），成功路径（emit / refresh / toast）就不会执行；`try/finally` 允许，因为它不吞异常、只用于复位 `moving` / `submitting` 这类状态。

### 认证

- **`useSession` 写 `nuxt-session` cookie**：`login.post.ts` 里显式 `maxAge` 1 天与 `cookie.sameSite: 'lax'`（httpOnly / secure 是 nuxt-session 的默认值），密封用应用密钥 `NUXT_APP_SECRET`（≥32 字符）：不自己造 token 与签名逻辑，`server/middleware/auth.ts` 一处校验除 `/api/auth/*` 外的全部 API。
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

- **判定规则：按「谁要看见」放，不按「谁先写的」放。** 跨 HTTP 边界的契约进 `shared/types/`；只在服务端存在的进 `server/`（上游 provider 响应、AI 工具入参、SQL 细节）；只在客户端的视图模型留 `app/`（`FolderNode`、`MoveDirection`）。
- **读类型不再写显式泛型**：`routeTypedFetch` 让 `useSelfFetch('/api/bookmarks')` 的 `data` 直接从服务端 handler 的返回值推出来（`SerializeObject<Bookmark>[] | undefined`），服务端改字段就会在这里报错。写成 `useSelfFetch<Bookmark[]>(...)` 是**断言而不是校验**：它覆盖推断，还会顺手关掉该次调用的路径 / method 检查（实测 `{ method: 'DELETE' }` 带泛型不报错、不带泛型报错）。只有响应形状与视图类型确实不同时才用泛型——本项目没有。
- **写类型在 `shared/types/db.ts` 命名一次**（`CreateBookmarkInput` / `UpdateBookmarkInput` / `MoveBookmarkInput` / `ReorderBookmarksInput` / `SaveNoteInput` / `SaveExpenseInput`）：请求体推不出来（写接口 handler 没有返回值），字段清单必须手写，那就只写这一份，别再各处 `Pick<InsertX, ...>`。`{ body }` 声明喂给 Nuxt 的路由类型生成器，前端 `selfFetch` 才会按它校验 body；第二个 `void` 是返回值——不写会退化成 `any`。**唯一例外是 `nuxt/server` 版的 `defineEventHandler`**（`login.post.ts` / `chat/index.post.ts`）：它只收返回值类型、声明不了 body，换成 h3 版会让 `useSession` 拿到不可移植的 event（NUXT_E8012），所以这两个接口的 body 前端不校验（登录表单 / AI SDK 自己拼的 body，已接受）。
- **`useSelfFetch` 必须用对象形式**（`createUseFetch({ $fetch: selfFetch })`）：回调形式在 `routeTypedFetch` 下会把工厂的请求形状推断成「所有路由 body 的并集」，`createUseFetch` 自身报错、`data` 跟着退化成 `unknown`。
- **`experimental.routeTypedFetch` + `strictRouteTypes` 常开**：前者把请求形状从 handler 声明推断到前端，后者让拼错的路径、路径与 method 不匹配直接报错；`routeTypedFetch` 在 Nuxt 5 会默认开启。代价是 `$fetch` / `useFetch` 不再接受 `params`（本项目不用）。

### AI（Chat 与工具）

- **Chat 只有两个配置**（`NUXT_CHAT_BASE_URL` + `NUXT_CHAT_API_KEY`）：任何 OpenAI 兼容端点都能用，换 provider 不改代码。
- **拉 `/models` 必须在服务端代理**（`/api/chat/models`）：请求要带 `chatApiKey`，而 `runtimeConfig.public` 会打进客户端产物。
- **必须保留 `stopWhen: isLoopFinished()`**：SDK 默认是 `isStepCount(1)`，只跑一步、连最终答案都没有。
- **不做字节层 SSE 合并**：成本模型是「上游帧数 × ~0.7 ms」（workerd 上每帧穿过 AI SDK 流式管线的固定开销；Node 只有 ~0.1 ms，所以本地完全不复现），而 provider 是一个 token 一帧，长回答曾两次撞 `exceededCpu`（实测 ~2.0 s CPU 才被终止）。曾经的 `server/utils/coalesce-sse.ts`（`coalescingFetch`，接在 `createOpenAICompatible` 的 `fetch` 上）**已删除**，当前**有意不合并**——CPU 不是当下的关注点。要捡回来只能从 git 历史取（`git show HEAD:server/utils/coalesce-sse.ts`，连同「哪些帧能合并、工具参数也要一起合并」的判据），位置只有一处：provider 解析之前。
- **正文渲染交给 comark，前端不做平滑**：`ChatPanel.vue` 用 `@comark/nuxt` 注册的全局 `Markdown` 组件（`:value` + `:streaming`；模块必须排在 `@nuxt/ui` 之后——它声明了对 `@nuxt/ui` 的 `moduleDependencies`），`useChat` 也不传 `throttle`——收到多少画多少，出字节奏**完全**由服务端的 `smoothStream` 决定（见下一条）。客户端限速试过两轮（自研 `app/utils/chat-smooth.ts`、`markstream-vue` 自带平滑）都已移除：一层限速足够，客户端那层只会把「流已结束但正文还在打」的窗口拉长、让自动滚动的尾巴更难看（两轮的实测细节在 git 历史里）。
- **服务端只做「按行合并」**：`streamText` 的 `experimental_transform: smoothStream({ delayInMs: 100, chunking: 'line' })`，把 text / reasoning 按行合并后再发给客户端（实测一轮对话从上游约 2300 帧降到 265 帧），省的是**下游帧数**。三点必须知道：**① 不省上游 CPU**——成本发生在它之前的解析环节；**② 不碰 tool 帧**——非 text / reasoning 的 chunk 原样透传（所以实测下游帧里工具参数反而占 54%）；**③ `delayInMs` 是每发一个 chunk 等 100 ms**，因为客户端不 throttle 也不平滑，**它是唯一的出字节奏**：粒度就是「一行」，长回答的 wall time 会被它拉长，`reasoning-delta` 也走同一条路（思考块长时整体耗时被它拉长）。所以**别把它调到很小**去换「更顺的粒度」——粒度越细、下游帧数越多，而客户端没有 throttle，重渲染次数跟着涨。**别把 `chunking` 改成 `'word'`**：中文不匹配 `\S+\s+`，正文会一路缓冲到最后才吐。
- **AI 工具只有三个新增工具**：`addBookmark` / `addNote` / `addExpense`，放在 `server/utils/ai-tools/{bookmarks,notes,expenses}/`（`insert.ts` + `index.ts` 聚合成 `xxxTools`，顶层汇总）。**每个工具自己定义参数、各按自己的语义命名，不共用 schema**（书签 `url`、笔记 `writtenDate`、记账 `amountYuan`），并在说明里逐条写清参数作用；统一约定只有「新增返回 `{ created }`」。
- **不提供查询 / 聚合 / 裸 SQL**：chat 只往库里写，统计与检索让用户回界面看——问「我这个月花了多少」时模型只会指向记账页，这是选定的行为。曾经的 `queryDatabase`（模型自己写 SQL）与各域 `findXxx` / `summarizeExpenses` 都已删除，**别再加回来**：模型手算不可靠（实测 93 行的账，手算第一遍总额差 6 元、笔数差 1），而 Workers 禁用 `eval` / `new Function`，通用计算器也解决不了它抄错数字。真要恢复查询，从 git 历史捞回旧实现，并连带恢复「查询不分页、说明里要求先收窄条件」的约定。
- **写入前必须让用户确认一次**：写在各工具描述的第一段（先说清要写什么，等用户同意再调）。这是**软约束**，靠模型自觉，拦不住偶发的直接调用；要硬拦才上 SDK 的 `toolApproval`（代价是 `ChatPanel` 那边得加一套确认 UI）。写入工具不合并成万能写工具、不提供编辑 / 移动 / 删除；插入逻辑抽在 `server/utils/{bookmark-create,note-create,expense-create}.ts` 与 REST 的 POST 共用，避免两套实现漂移。
- **`addBookmark` 只加到根层级**：`folderId` 参数已随查询工具一起去掉——没有查询工具就没人能给出文件夹 id，留这个参数只会诱导模型瞎猜、撞上 `createBookmark` 的 `parentId` 校验报错；要归档让用户在书签页自己移动。
- **system 只写通用偏好，不复述工具**：`server/api/chat/index.post.ts` 的 `system` 只有三句——精简回答、只用普通标点（不要 emoji / 箭头 / 装饰性符号 / ASCII 分隔线）、聚焦在自己的能力上（本轮对话 / 自身知识 / 可调用工具的结果），越界的东西（拿不到的数据、自己没有的能力）不许猜、不许假装，拿不到就直说。工具名、参数、使用场景随 `tools` 字段注入，模型本来就看得见，**在 system 里复述等于多付 token 且必然漂移**；只有「工具描述里放不进去的东西」（缺能力时的策略、能力边界约束、输出格式偏好、偏好顺序）才值得写进 system。
- **不给模型任何时间信息**：不注入当前日期，也没有 `getTime` 之类的日期工具。日期参数留空 = `Asia/Shanghai` 当天，由插入工具自己补（`dateKeyToMs(toDateKey(Date.now()))`），格式与默认值都写在各工具的 schema / 说明里。代价：「昨天 / 上周」这类相对日期模型解析不了——用户不说日期就落今天，说了就按用户给的字符串写。要恢复日期感知，注入 `Today is YYYY-MM-DD (Asia/Shanghai)` 比给工具便宜（后者是整整一个 step 的上游往返）。

### UI（Nuxt UI / Reka）

- **报错文字统一隐藏**（`app.config.ts` 的 `ui.formField.slots.error = 'hidden'`）：报错 div 出现/消失会撑高弹窗、输入时来回跳动；`validate` 照旧拦提交、无效字段照旧变红，必填只靠星号，新增表单不用单独处理。
- **`UTree` 的 `get-key` 必须对 `{}` 安全**（Reka 用 `getKey(modelValue ?? {})` 探测未选中）：写成 `String(item.id)`，**不要在 `get-key` 里对节点做多层取值**（如 `item.xxx.id`）——会在树挂载时抛错、**整页白屏**。
- **选中样式统一由 `ui.link` 决定**：书签页的树是导航，底色和文字色一起去掉；移动弹窗是选择器，必须留一个选中标记（`aria-selected:text-primary`）。两份 `ui` 各写一遍、不抽常量，因为两处约束不同。
- **移动弹窗把 `expanded` 做成受控值 + `selection-behavior="replace"`**：点击 `UTree` 节点会同时选中并折叠（Reka 的 onClick 先 select 再 toggle），受控后点一下只选中、所有文件夹保持展开；默认 `toggle` 会取消选中，造成「高亮没了但 `formState.target` 还在」的不一致。
- **右键处理器不能 `event.stopPropagation()`**：Reka 的 `ContextMenuTrigger` 要靠事件冒泡到触发元素才会在指针位置打开菜单。笔记行用 `data-note-id` + `closest` 反查，不照搬书签树的 token class 方案（那是 `UTree` 只透传 `item.class` 的变通）。
- **`DatePicker` 封成只收发 `YYYY-MM-DD` 字符串的组件**：`:reference` 用包住 `UInputDate` 的 `<div>`，不用内部 `inputsRef[...]`（弹窗会压在输入框上）、也不用组件 `$el`（位置跑到视口外）；`UInputDate` 空值 `null`、`UCalendar` 空值 `undefined`，差异在组件内各配一个 computed 消化。
- **弹窗按钮统一放 `UModal` 的 `#footer`、右对齐**；表单弹窗的按钮不在 `UForm` 内，所以不用 `type="submit"`，而是 `formRef?.submit()` 触发校验链路。`UModal` 没有 `size` prop，宽度只能用 `ui.content` 覆盖（主题默认 `max-w-lg`），冲突交给 tailwind-merge。
- **菜单分节统一约定**：所有右键菜单都是「上面一组放全部非删除项、最下面单独一组只放 `Delete`」，两组之间就是分隔线；Delete 不与其它项混组。
- **记账/笔记的 `UCard` 分组**：`root: 'ring-inset'` + `body: '… divide-y divide-default …'`。`ring-inset` 是因为主题默认 `ring ring-default`，而卡片外面就是 overflow 滚动容器、外描边会被裁掉；`divide-y` 只作用于 body 的直接子元素，行之间不用自己加边框；**改内边距必须连 `sm:` 那份一起改**——主题默认 `header: 'p-4 sm:px-6'` / `body: 'p-4 sm:p-6'`，只写 `p-*` / `px-*` 盖不住 `sm:` 那一层。不手写 `ring-default` / `bg-default` 这类语义色 class 拼表面。滚动条统一用 Tailwind 内置 `scrollbar-none` 隐藏（滚动能力仍在）；Toast 用 `useToast()`。
- **`UChatMessages` 的 `status` 直接透传**：前端不做平滑（见上），流一结束正文就画完了，自动滚动不需要兜底；也别动 `submitted` 的语义——那是「把刚发出的消息滚到顶部」的触发时机。

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
- **CPU 限制（踩过两次）**：Workers Free 每请求只有 10ms CPU（Paid 默认 30s，`limits.cpu_ms` 最多 5 分钟；Free 上写该字段部署报 error 100328），但 isolate 对偶尔超限有弹性额度：实测两次事故都在 ~2.0s CPU 才被终止，这就是 Free 上的实际天花板。成本模型是 **上游 SSE 帧数 × ~0.7 ms**（workerd 实测，Node 只有 ~0.1 ms）——长回答最容易撞线，现在也不再做帧合并，原因与恢复入口见 AI 一节的「不做字节层 SSE 合并」。排查入口：Workers Logs 的 `cpuTimeMs` / `wallTimeMs` / `outcome`，或 dashboard 的 Metrics → Errors → Invocation Statuses 里的 `Exceeded CPU Time Limits`。
- 开发用本地 SQLite（`.data/db/sqlite.db`，`@nuxthub/core` 自动处理、无需环境变量），生产 D1 由 `NITRO_PRESET=cloudflare_module` 让 `hub.db` 切到 `d1` driver；d1 binding 模式不需要 `NUXT_HUB_CLOUDFLARE_*`（那是 `d1-http` driver 才需要）。Drizzle Kit 无独立配置，迁移文件在 `server/db/migrations/sqlite/`。
- `pnpm backup` 经 binding `DB` 从根 `wrangler.jsonc` 解析库名导出远程 D1 到 `db.sql`（已 gitignore），不依赖构建产物。

## 项目技能

`skills-lock.json` 锁定、装在 `.agents/skills/`：界面/组件/表单任务用 `nuxt-ui`；Cloudflare Workers/D1 开发用 `cloudflare`；运行或修改 wrangler 命令前用 `wrangler`。

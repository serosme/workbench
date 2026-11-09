# Workbench Agent Instructions

个人自用的 Nuxt 4 应用：单用户密码登录；书签页 = 左侧书签树 + 右侧文件树，笔记页 = 按书写日期分组的卡片，记账页 = 按月/按天分组的流水；节点与空白处都用右键菜单。技术栈：Nuxt 4、Nuxt UI v4、Nuxt Hub（DB + Blob）、Drizzle + SQLite/D1、Tailwind v4、TypeScript 6。

> 本文件只写三类东西：**必须遵守的约束**、**决策点与理由**（为什么用这个、为什么不用那个）、**命令与环境事实**。页面结构、组件用法、API 行为、表结构、目录清单都能读代码得到，不在这里复述，改动代码时按需读源码。
>
> **维护时机**：每次改动后判断一次本次是否产生了新的约束、取舍或环境事实，有就在同一次改动内写进来（能并进已有条目就并，不新开条目），没有就不动本文件。判断标准是「这条以后还能约束别人吗」——答不上来就留在代码里。

## 核心约束

- **纯客户端渲染**（`nuxt.config.ts` 的 `ssr: false`）：不写 SSR 分支、不指望服务端取数；`selfFetch` 的 401 跳转用 `navigateTo`（带 `redirect` 查询参数回登录页）。代价是首屏要等客户端请求，期间页面是空的（没有骨架屏），留白由默认布局的 padding 提供。
- **个人自用、单用户、单浏览器**：不为假想场景加防御代码、重复校验、无意义状态分支或多余 `try/catch`；只在真实外部边界（请求、用户输入）处理错误。
- **优先在现有技术栈与现有文件里改**：遵循现有命名、目录职责与数据流；不为小功能加抽象层、通用层或架构；不擅自改已有 API、配置字段或模块边界。
- **自动导入**：`app/composables/*`、`app/utils/*`、`app/components/*`、`server/utils/*`、`shared/types/*` 的类型、`shared/utils/*` 的常量与工具（服务端与客户端都可用）、`@nuxthub/db` 的 `db` / `schema`、`@nuxthub/blob` 的 `blob` 与客户端的 `useMultipartUpload` 直接用，不写重复 import。服务端事件工具分两种：**用 session / web RequestEvent 的 handler 从 `nuxt/server` 导入所需事件工具（`defineEventHandler` / `readBody` / `createError` / `useSession` / `getSession` / `useRuntimeConfig`）**（`nuxt/server` 版 `defineEventHandler` 只收返回值类型、声明不了 body），其余 handler 用 h3 自动导入的 `defineEventHandler` / `readBody` / `readValidatedBody` / `createError` / `getRouterParam`；**同一个文件不要混用两种 `defineEventHandler`**（h3 event 与 nuxt/server 的 web RequestEvent 混用会报 `NUXT_E8012`）。
- **模板只能引用 `script` 里出现过的标识符**：只写在模板里的自动导入工具函数会被 vue-tsc 当成组件属性，报 `Property 'formatAmount' does not exist on type 'ComponentPublicInstance<...>'`（`nuxt typecheck` 会失败，但运行时不报错，因为构建期的模板自动导入仍会注入）。所以模板专用逻辑要在 `script` 里收口，例如 `const money = (cents: number) => \`¥${formatAmount(cents)}\``。
- 页面请求走 `selfFetch` / `useSelfFetch`；样式用 Tailwind class 与 Nuxt UI 的 `ui` 属性。
- **注释只写从代码看不出的取舍与坑**，不复述代码；能并进本文件的就并进来。界面文案（菜单/弹窗/Toast）用英文。
- **任何代码修改之后都必须执行 `pnpm lint` 与 `pnpm typecheck`**，哪怕只改一行、只改一个字符串；不得新增错误，并在回复里说明两条命令的结果（通过，或剩余错误是什么）。没跑就不算改完。
- **禁止 `pnpm lint:fix`**——只用 `pnpm lint` 检查，且只修复本次改动相关代码的错误。
- 不把构建产物、缓存、依赖与本地数据纳入 Git（`.output`、`.nuxt`、`.data`、`node_modules`、`.env`、`db.sql`、`.wrangler`）。

## 决策点

### 渲染与取数

- **书签页两栏等两边请求都落地才一起渲染**（`v-if="data && filesReady"`，不用 `status`）：否则两栏会先后出现、不同步。`data` 还在时刷新不整页闪；`filesReady` 由 `useFiles` 给（`data !== undefined || error !== undefined`），**不用 `status !== 'pending'`**——上传成功后的 refresh 会把 status 短暂置回 pending，那会把整页收起来；**也不能只看 `data`**，否则文件接口挂掉（R2 绑定缺失等）时整页永远空白。两个请求在 setup 里并发发出，等待时间是两者的较大者。左栏 `md:w-2/5` 放书签树，右栏 `hidden md:flex md:flex-1` 放文件树（两栏 4:6），所以移动端只有书签树。
- **`selfFetch` / `useSelfFetch` 而不是裸 `$fetch`**：401 跳登录与错误 toast 只有一处实现，业务代码拿到的语义统一（还有 `useSelfFetch` 为什么必须用对象形式，见「类型与跨端契约」）。
- **`/` 的两套跳转**：`routeRules` 的 307 只处理服务端硬加载；SPA 内部 `navigateTo('/')` 走 `pages/index.vue` 再 replace 到 `/bookmarks`；登录成功的默认跳转直接去 `/bookmarks`，少一跳。
- **fail loudly，不写 `try/catch` 包请求**：`selfFetch` 已全局弹错误 toast，异常自然传播（unhandled rejection 即预期表现），成功路径（emit / refresh / toast）就不会执行；`try/finally` 允许，因为它不吞异常、只用于复位 `moving` / `submitting` 这类状态。唯一例外是 `selfFetch` 的 `onRequestError` 里 `name === 'AbortError'` 直接 return：`useSelfFetch` 在组件卸载 / 去重 / `enabled: false` 时都会中止在途请求，ofetch 把这次中止也交给 `onRequestError`，不拦就会在切页时弹「AsyncData request cancelled by unmount」这类无意义 toast（`useAsyncData` 自己会吞掉 AbortError 并把状态置回 idle，所以拦掉不会丢真实错误）。
- **外链书签用 `navigateTo(url, { open: { target: '_blank' } })`，不用 `{ external: true }`**：`external` 的客户端实现是先 `nuxtApp._scope.stop()` 再 `location.href = url`——停 scope 会连带销毁 Nuxt UI colors 插件注入的 `<style id="nuxt-ui-colors">`，于是点书签瞬间整页丢失 primary 配色（绿色变透明/黑、布局不变，见「命令」一节 unhead 那条），而且应用停在屏幕上时响应式已全停；`open` 在函数最前面就走 `window.open()` 并立刻返回，当前标签既不换文档也不停 scope。代价是书签一律新标签打开，这是选定的行为；因此书签右键菜单**不再保留 `Open in New Tab`**（左键就是新标签，留一个同义项纯属重复）。

### 认证

- **`useSession` 写 `nuxt-session` cookie**：`login.post.ts` 里显式 `maxAge` 1 天与 `cookie.sameSite: 'lax'`（httpOnly / secure 是 nuxt-session 的默认值），密封用应用密钥 `NUXT_APP_SECRET`（≥32 字符）：不自己造 token 与签名逻辑，`server/middleware/auth.ts` 一处校验除 `/api/auth/*` 外的全部 API。
- **登录失败返回 401**：密码错误属于认证失败；`selfFetch` 对 `/api/auth/*` 不跳登录，改成 401 不会误触发跳转。密码比较仍用 `!==`：单用户 + 长密码 + HTTPS，时序攻击不在当前威胁模型内，不引入哈希/常量时间比较；真要加固优先做登录限流。
- **CSRF 防护依赖 `sameSite=lax`**（跨站 POST 不带 cookie）：不要改成 `none`——单用户应用没有额外的 CSRF token 机制，改了就等于所有写接口裸奔。

### 书签排序模型

- **分组键是 `(parentId, type)`，`sortBookmarks` 是唯一权威**：组内恒定「文件夹优先 → `position` 升序」，所以 UI 里一段连续可视区间恰好等于一个分组；`GET /api/bookmarks` 的返回顺序只是顺便自洽，客户端不依赖它。
- **移动只做整段重编号（写回 `1..n`），永不交换 position 值**：历史 position 来自全局计数器，可能带偏移和间隙，交换语义未定义且无法自愈。新建位置由服务端取目标分组 `max(position) + 1`（空分组为 1），客户端不计算、不提交；编辑不动 `position`。因此历史数据不需要预先迁移。
- **重编号必须走 `server/utils/renumber.ts` 的 `renumberGroupQuery`**（SQLite JSON1 的 `json_each` 把顺序当参数传入）：语句数恒为 1、绑定参数最多 4 个，与分组大小无关。不改成「每行一条 UPDATE」（随 N 线性增长，撞 D1 每批语句数限制），也不改成「单条 CASE」（要 2N 个绑定参数，撞 D1 每查询 100 个绑定参数限制）。代价是**调用方必须传该分组的完整成员**——服务端不做覆盖度校验，漏传的行不会被更新。
- **四个同级移动共用一个 `move(id, direction)`**（`up | down | top | bottom`），差别只是目标下标：不单独加 `moveToEdge`，也不用循环调 `move` 实现首尾（一次整组重编号即可）。`move` 开头先 `canMove`：已在两端时 `splice(-1, 0, id)` 会插到倒数第二位、静默写坏顺序。
- **移动的两条通道**：同父级走 `PUT /api/bookmarks/reorder`；跨父级走 `PUT /api/bookmarks/move`（`db.batch()` 里「源组重编号 → 更新 parentId → 目标组重编号」原子完成，目标组写最后，所以同父级移动也正确）。`reorder` / `move` 是静态路由，优先于 `[id]`。
- **跨父级候选树用 `buildFolderTree(data, item)`**：util 只剪掉「它自己」，子孙天然进不来；不剪会成环，而成环的行在 `buildTree` 里都成不了 root，整棵子树从界面消失且再也点不到。服务端 `move.put.ts` 再拒一次（自身、不存在、移进自己的子孙）。
- **`createBookmark` 与 `move` 都校验 `parentId` 必须是 `null` 或已存在的文件夹**：孤儿行会让 `buildTree` 抛错、书签页白屏；`buildTree` 对未知父级降级为 root 作为第二道防线，别把这条兜底删掉。

### 数据存储

- **日期一律存「`Asia/Shanghai` 当天零点的毫秒时间戳」**，服务端换算固定在 `server/utils/datetime.ts`（固定 `+8`，中国无夏令时）：服务器跑在 UTC，不能复用客户端 `app/utils/datetime.ts`（那是浏览器时区），两个文件**不可互相复用**。客户端展示与表单回填按浏览器时区，浏览器不在 `+8` 时分组日期会偏移——这是已知取舍；REST 写入走服务端固定 `+8`。
- **金额存整数「分」**，展示走 `formatAmount`，输入走 `UInputNumber`（表单态是元，提交时乘 100 取整）：不做元的浮点运算，避开 SQLite `real` 的 IEEE754 误差，小计累加才可靠。
- **`notes` / `expenses` 没有 `position`**：列表顺序完全交给 `writtenAt` / `spentAt`（倒序），不需要书签那套分组重编号。写入时间由客户端传值，服务端不写 `Date.now()`。
- **删除不做存在性预检**（删 0 行、幂等），也不弹确认框、没有撤销：个人自用刻意保持简单；删除菜单项统一 `color: 'error'` + `i-lucide-trash-2`。

### 文件存储（Nuxt Hub Blob）

- **存储走 `@nuxthub/blob` 的 `blob.*`，不直接读 `event.context.cloudflare.env` 下的 R2 binding**（`nuxt.config.ts` 的 `hub.blob: true`）：driver 由 hosting 自动选，本地 `fs`（`.data/blob`）、Cloudflare 构建 `cloudflare-r2`，binding 名固定 `BLOB`（`wrangler.jsonc` 的 `r2_buckets`，bucket `workbench-r2`）。本地 Blob 目录不会同步到线上 R2，两边数据独立。
- **`GET /api/files` 只回扁平列表 `{ pathname, size }[]`，树在客户端用 `app/utils/blob-tree.ts` 的 `buildFileTree` 建**：与 `GET /api/bookmarks`（扁平 + 客户端 `buildTree`）保持同一规则——服务端不持有视图模型，`FileTreeNode` 是客户端类型（放 `app/`，不进 `shared/`）。节点的 `key` 同时是唯一标识、删除路径与下载路径：文件夹以 `/` 结尾，文件是完整 pathname，所以不再有单独的 `id`。
- **列目录永远走 `server/utils/blob-files.ts` 的 `listBlobs(prefix)`（拉全量 + 内存按前缀过滤），不用 `blob.list({ prefix })`**：fs driver 把 prefix 当目录名（`join(dir, prefix)`），传文件 key 会以「读目录」失败返回空列表，于是删除变成「接口成功但什么都没发生」。前缀尾部斜杠剥掉再拼 `${base}/` 比较，否则 `docs` 会误匹配 `docs-other.txt`。
- **上传走分片（`useMultipartUpload` → `/api/files/multipart/[action]/[...pathname]`），不退到单请求整体上传**：`readMultipartFormData` 会整份进内存（峰值 2~3 倍文件大小，几十 MB 就撞 Workers 128MB 上限、报错误 1102），「把请求体流交给 `blob.put`」会报 `Provided readable stream must have a known length`。分片按片缓冲，内存峰值是 `partSize × concurrent`（10MB × 1）。
- **`partSize × concurrent` 就是服务端内存峰值，`concurrent` 固定 1**：本地 fs driver 的分片状态是本地 JSON，每个分片请求都要「读 → 改 → 写回」，并发会互相覆盖或读到半截 JSON，报 `Multipart upload not found`（这个错名也盖了「文件不存在」和「JSON 解析失败」）；线上 R2 虽在服务端维护状态，也为两端一致用串行。
- **`useMultipartUpload` 的 `completed` 只 resolve 不 reject**：重试耗尽后是 catch 后直接 return，成功 resolve `complete` 的返回值、失败 resolve `undefined`，所以 `useFiles.upload` 必须判空抛错，否则上传失败会被当成成功（弹窗照常关闭并 refresh）。
- **不展示上传进度**：弹窗只用 `submitting` 禁用交互与提交按钮，不传 `onProgress`。库的 `progress` 是「已完成片数 / 总片数」且先赋值再 push（滞后一片），按片换算出的百分比要么全程 0%、要么卡在 (n-1)/n；为了它还得在 `useFiles` 里挂 `watch` 再手动停（不在 setup 作用域），不值得。
- **上传失败必须显式弹 toast**：`completed` 判空后抛出的错误只会变成 unhandled rejection，而分片上传用的是库自带的 ofetch、**不经过 `selfFetch`**，全局错误 toast 管不到这里——所以 `useFiles.upload` 在 catch 里 `useToast()` 报一次再重新抛出（不吞异常，弹窗靠 reject 保持打开）。
- **本地中断上传会留残留**：fs driver 把分片元数据写在 blob 目录里（`<pathname>.mpu.<uploadId>.json` 与 `.mpu.<uploadId>/`），`walkDir` 会把它们当普通对象列出来，本地中途关页面 / 刷新就会让这些垃圾节点进文件树（线上 R2 没有这个问题）。清理就是手动删 `.data/blob` 下对应的文件；对应地**别拿「目录里多出 `*.mpu.*`」当代码 bug**。
- **下载必须走 `blob.serve`，并在 `blob.head` 之后拦大小**：`blob.serve` / driver 的 `get` 都是整份读进内存，所以超过 `MAX_DOWNLOAD_BYTES`（96MB，`shared/utils/limits.ts`）直接 413（128MB 是 per-isolate，还要装应用与并发请求，再大就是赌运气），本地与线上同一个上限。**客户端点下载前也用同一个常量先拦**（`useFileMenu`），否则浏览器会打开一段 413 JSON；改上限只改 `shared/utils/limits.ts` 一处。**`Content-Disposition` 头值只能是 latin1**：中文名直接写进 `filename=` 会抛 `ERR_INVALID_CHAR`、整个下载 500，所以 ASCII 回退一份、真名走 RFC 5987 的 `filename*=UTF-8''…`。
- **文件夹靠 key 末尾的 `/` 表达，删除时前缀带出整棵子树**：`index.delete.ts`（`DELETE /api/files?path=`，query 走 `server/utils/validate.ts` 的 `filePathQuerySchema`，与其它写接口一样过 zod）对 `path.endsWith('/')` 用 `listBlobs(path)` 收集全部 pathname 再一次 `blob.del(keys)`；driver 的 delete 忽略不存在的 key，所以不做存在性预检（幂等）。handler 不写 return，`undefined` 经 Nitro 的 preemptive router 变 204。
- **上传弹窗只收「路径前缀 + 文件」，key = `prefix/文件名`**：新增的层级不需要预先存在，上传后自然出现在树里——这就是「新建文件夹」的替代（不做单独的建目录接口）。在文件夹上上传时前缀默认是该文件夹的 key，用户可以继续追加。上传期间路径输入与选择按钮都 `:disabled="submitting"`，避免中途改 key。
- **`upload` 由页面注入弹窗（`:upload` prop），不要在弹窗里再调 `useFiles()`**：两个组件各调一次会在同一 key 上重复发起 `useSelfFetch('/api/files')`，Nuxt 去重会取消其中一个并抛 `AbortError: AsyncData request cancelled by deduplication`。
- **文件树右键靠 token class 定位节点**（与书签树同一套手法）：`UTree` 只透传 `item.class` 到带 `data-slot="link"` 的元素，所以 `FileTree.vue` 组树时给每个节点挂 `file-node-<n>` 并建 token → node 的 Map，`@contextmenu` 里 `closest('[data-slot="link"]')` 读类名反查；拿不到类名就当成空白处（弹根级上传菜单）。文件图标不区分扩展名，统一 `i-lucide-file` / `i-lucide-folder`。
- **文件树是书签页右栏的一个组件，不是独立页面**：它自己管自己的滚动容器与 `useScrollMask`，外观与书签树一致（两处共用 `app/utils/tree-ui.ts` 的 `treeNavUi`），所以两栏看起来是一套树；`PageNav` 只有书签 / 笔记 / 记账三项。

### 类型与跨端契约

- **判定规则：按「谁要看见」放，不按「谁先写的」放。** 跨 HTTP 边界的契约进 `shared/types/`，两侧都要用的常量与格式化进 `shared/utils/`（下载上限、`formatBytes`）；只在服务端存在的进 `server/`（SQL 细节、运行时校验）；只在客户端的视图模型留 `app/`（`FolderNode`、`MoveDirection`、`FileTreeNode`）。
- **读类型不再写显式泛型**：`routeTypedFetch` 让 `useSelfFetch('/api/bookmarks')` 的 `data` 直接从服务端 handler 的返回值推出来（`SerializeObject<Bookmark>[] | undefined`），服务端改字段就会在这里报错。写成 `useSelfFetch<Bookmark[]>(...)` 是**断言而不是校验**：它覆盖推断，还会顺手关掉该次调用的路径 / method 检查（实测 `{ method: 'DELETE' }` 带泛型不报错、不带泛型报错）。只有响应形状与视图类型确实不同时才用泛型——本项目没有。
- **写类型在 `shared/types/db.ts` 命名一次**（`CreateBookmarkInput` / `UpdateBookmarkInput` / `MoveBookmarkInput` / `ReorderBookmarksInput` / `SaveNoteInput` / `SaveExpenseInput`）：请求体推不出来（写接口 handler 没有返回值），字段清单必须手写，那就只写这一份，别再各处 `Pick<InsertX, ...>`。`{ body }` 声明喂给 Nuxt 的路由类型生成器，前端 `selfFetch` 才会按它校验 body；第二个 `void` 是返回值——不写会退化成 `any`。**唯一例外是 `nuxt/server` 版的 `defineEventHandler`**（`login.post.ts`）：它只收返回值类型、声明不了 body，换成 h3 版会让 `useSession` 拿到不可移植的 event（NUXT_E8012），所以登录接口的 body 前端不校验（表单自己拼的 body，已接受）。
- **运行时校验在 `server/utils/validate.ts`**：REST 写接口用 zod schema 的 `readValidatedBody` 与 `getNumericId`（h3 内置，非法 body / id 直接 400），字段与 `shared/types/db.ts` 的写契约保持一致；客户端表单另用 `UForm` 的 `:schema`，两边不共享 schema（表单态与请求体形状不同）。REST handler 仍用 h3 的 `defineEventHandler` 泛型，因为 `routeTypedFetch` 的 body 类型只从 h3 `H3Event` 抽；Nuxt 的 web-standard handler 还没有请求体泛型，等原生支持后再整体迁移。
- **`useSelfFetch` 必须用对象形式**（`createUseFetch({ $fetch: selfFetch })`）：回调形式在 `routeTypedFetch` 下会把工厂的请求形状推断成「所有路由 body 的并集」，`createUseFetch` 自身报错、`data` 跟着退化成 `unknown`。
- **`experimental.routeTypedFetch` + `strictRouteTypes` 常开**：前者把请求形状从 handler 声明推断到前端，后者让拼错的路径、路径与 method 不匹配直接报错；`routeTypedFetch` 在 Nuxt 5 会默认开启。代价是 `$fetch` / `useFetch` 不再接受 `params`（本项目不用）。

### UI（Nuxt UI / Reka）

- **报错文字统一只留可访问文本**（`app.config.ts` 的 `ui.formField.slots.error = 'sr-only'`）：`hidden` 会让报错进不了可访问性树、屏幕阅读器读不到；`sr-only` 不占布局高度，报错出现/消失不会撑高弹窗，`validate` 照旧拦提交、无效字段照旧变红，必填只靠星号。
- **表单校验统一用 `UForm` 的 `:schema` + zod**：四个弹窗不再手写 `FormError[]`；金额字段用 `UInputNumber`、表单态存元，提交时才转分。
- **`UTree` 的 `get-key` 必须对 `{}` 安全**（Reka 用 `getKey(modelValue ?? {})` 探测未选中）：书签树写成 `String(item.id)`、文件树写成 `String(item.key)`，**不要在 `get-key` 里对节点做多层取值**（如 `item.xxx.id`）——会在树挂载时抛错、**整页白屏**。
- **选中样式统一由 `ui.link` 决定**：导航树（书签树与文件树）底色和文字色一起去掉，两者共用 `app/utils/tree-ui.ts` 的 `treeNavUi`——**别各写一份**，否则同一页里两棵树会慢慢长歪；移动弹窗是选择器，必须留一个选中标记（`aria-selected:text-primary`），所以它单独写一份 `ui`，不与导航树共用。
- **移动弹窗把 `expanded` 做成受控值 + `selection-behavior="replace"`**：点击 `UTree` 节点会同时选中并折叠（Reka 的 onClick 先 select 再 toggle），受控后点一下只选中、所有文件夹保持展开；默认 `toggle` 会取消选中，造成「高亮没了但 `formState.target` 还在」的不一致。
- **右键处理器不能 `event.stopPropagation()`**：Reka 的 `ContextMenuTrigger` 要靠事件冒泡到触发元素才会在指针位置打开菜单。笔记行用 `data-note-id` + `closest` 反查，不照搬书签树的 token class 方案（那是 `UTree` 只透传 `item.class` 的变通）。
- **`DatePicker` 封成只收发 `YYYY-MM-DD` 字符串的组件**：`:reference` 用包住 `UInputDate` 的 `<div>`，不用内部 `inputsRef[...]`（弹窗会压在输入框上）、也不用组件 `$el`（位置跑到视口外）；`UInputDate` 空值 `null`、`UCalendar` 空值 `undefined`，差异在组件内各配一个 computed 消化。
- **弹窗按钮统一放 `UModal` 的 `#footer`、右对齐**；表单弹窗的按钮不在 `UForm` 内，所以不用 `type="submit"`，而是 `formRef?.submit()` 触发校验链路。`UModal` 没有 `size` prop，宽度只能用 `ui.content` 覆盖（主题默认 `max-w-lg`），冲突交给 tailwind-merge。
- **菜单分节统一约定**：所有右键菜单都是「上面一组放全部非删除项、最下面单独一组只放 `Delete`」，两组之间就是分隔线；Delete 不与其它项混组。组内顺序**书签与文件夹一致**：新建项（仅文件夹菜单有）→ `Edit` → `Move`（`Move` 是项很多的二级菜单，固定放组内最后）。
- **记账/笔记的 `UCard` 分组**：`root: 'ring-inset'` + `body: '… divide-y divide-default …'`。`ring-inset` 是因为主题默认 `ring ring-default`，而卡片外面就是 overflow 滚动容器、外描边会被裁掉；`divide-y` 只作用于 body 的直接子元素，行之间不用自己加边框；**改内边距必须连 `sm:` 那份一起改**——主题默认 `header: 'p-4 sm:px-6'` / `body: 'p-4 sm:p-6'`，只写 `p-*` / `px-*` 盖不住 `sm:` 那一层。不手写 `ring-default` / `bg-default` 这类语义色 class 拼表面。滚动条统一用 Tailwind 内置 `scrollbar-none` 隐藏（滚动能力仍在）；Toast 用 `useToast()`。
- **保留 `:focus-visible` 焦点指示**：`main.css` 不再全局 `outline: none`（Nuxt UI 主题靠 outline 表达焦点）；图标按钮要有可访问名。笔记/记账行保持可点击 `<div>`（鼠标/右键操作），不要改成 `<button>`。
- **布局用 `h-dvh` 而不是 `h-screen`**（移动端地址栏），`app.head.htmlAttrs.lang = 'en'`；页面标题保持默认的 `Workbench`，不逐页设置 `useHead`。
- **滚动边缘遮罩统一用 `useScrollMask`（`app/composables/useScrollMask.ts`），不直接调 Nuxt UI 的 `useScrollShadow`**：笔记、记账、书签树、文件树四处都用它，`:style` 拿到的是 `mask-image: linear-gradient(...)`——24px 渐变、按 `orientation` 自动决定上下哪边淡出、不溢出时不出现。直接调 `useScrollShadow` 的坑是：它内部是 vueuse `useScroll`，`arrivedState` 只在挂载、滚动事件与 `scrollend` 时更新，**没有 ResizeObserver / MutationObserver**；内容由接口异步填充时，容器从「不溢出」变「溢出」不产生任何滚动事件，下边缘遮罩要等用户第一次滚动才出现——而它唯一的作用就是在滚动之前提示「下面还有内容」。所以 `useScrollMask` 在元素挂上后同时观察 `childList/subtree` 与自身尺寸，变化时合成一次 `scroll` 事件让它重新测量；**合成事件是唯一的公开入口**，因为 `useScrollShadow` 只返回 `style / isOverflowing / arrivedState`、没透出 `measure()`。观察器的清理走 `watch` 回调的第三个参数 `onCleanup`，**不能写成 `onScopeDispose`**：watcher 回调不在任何 effect scope 里执行（`ReactiveEffect.run` 只切 `activeSub`、不碰 `activeEffectScope`），`onScopeDispose` 会报「no active effect scope」警告且**注册不上**，卸载时 observer 永不 disconnect、闭包还继续钉着已卸载的 DOM（`immediate: true` 第一次同步跑在 setup 里、那时 `useTemplateRef` 还是 `null` 直接 return，所以警告要到挂载后才出现）；`onCleanup` 显式绑在 watcher 自己的 effect 上，卸载（scope 销毁 → `effect.stop()` → `onStop`）与每次重跑前都会执行。别改成自研渐变（丢掉 Nuxt UI 的方向判断与溢出判断）或 `pnpm add @vueuse/core`（那只是 Nuxt UI 的传递依赖，应用层 import 不到它）——`UScrollArea` 的 `shadow` prop 也是同一个 composable，换成它并不能解决滞后。

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
- 本地密钥在 `.env`（已 gitignore，模板 `.env.example`）：`NUXT_APP_PASSWORD`（登录密码）、`NUXT_APP_SECRET`（≥32 字符，密封 session）。两者都映射到 `runtimeConfig.appPassword` / `appSecret`。
- `pnpm-workspace.yaml` 用 `trustPolicyIgnoreAfter: 1440` 而不是逐个列 `trustPolicyExclude`：只对发布不满 1440 分钟的新版本做 trust 校验，绕过 cssnano / postcss-* 家族换发布流程造成的 no-downgrade 误报（该值只能是整数分钟，写 `1d` 会报 `invalid u64`）。`minimumReleaseAgeExclude` 列本次升级引入的新版本以绕过发布等待期，配 `minimumReleaseAgeExcludePrune: true` 让 pnpm 自动清理失效条目、不用手工维护名单。
- **不要写 `navigateTo(url, { external: true })`（任何会让 Nuxt 停掉 app scope 的硬跳转同理）**：它在跳转前先执行 `nuxtApp._scope.stop()`，而 unhead 3.4.3 起 scope 停止会连带销毁 Nuxt UI `colors` 插件用 `useHead` 注册的 `<style id="nuxt-ui-colors">`——`--ui-primary` / `--ui-color-*` 只在这个 style 里，没了就只剩静态 CSS，于是整页丢 primary 配色（绿色变透明/黑、布局不变），而且页面还停在屏幕上时响应式已全停。外链一律走 `navigateTo(url, { open: { target: '_blank' } })`（见「渲染与取数」），所以当前没有 `external: true` 调用点，也就**没有**再给 unhead 加 `overrides`；将来真需要同标签硬跳转时，先把 `unhead` / `@unhead/vue` 钉回 3.4.2（`pnpm-workspace.yaml` 的 `overrides`）。验证方法：控制台执行 `document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$nuxt._scope.stop()`，3.4.3 会让 `getComputedStyle(document.documentElement).getPropertyValue('--ui-primary')` 变空、该 style 从 1 变 0；3.4.2 不受影响。

## 部署（Cloudflare Workers + D1）

- `pnpm deploy` 一条链：`NITRO_PRESET=cloudflare_module` 构建 → `wrangler deploy --keep-vars` → `wrangler --config .output/server/wrangler.json d1 migrations apply DB --remote`。迁移命令必须显式 `--config`（`migrations_dir` 相对该文件解析）；worker 名与 D1 绑定（按 `database_name`，不用维护 UUID）都在 `wrangler.jsonc`，构建时 nitro 合并到 `.output/server/wrangler.json`。
- `workers_dev` / `preview_urls` 都是 `false`：不对外暴露 `*.workers.dev`，需要自定义域名 / route 才能访问。
- 生产密钥用 `wrangler secret put`（`NUXT_APP_PASSWORD`、`NUXT_APP_SECRET`）：与本地 `.env` 独立，`--keep-vars` 不覆盖 secrets。前提是 wrangler 已认证（`wrangler login` 或 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`）。
- **CPU 限制**：Workers Free 每请求只有 10ms CPU（Paid 默认 30s，`limits.cpu_ms` 最多 5 分钟；Free 上写该字段部署报 error 100328），但 isolate 对偶尔超限有弹性额度（实测超限事故要 ~2.0s CPU 才被终止），所以本地跑得动不代表线上跑得动。排查入口：Workers Logs 的 `cpuTimeMs` / `wallTimeMs` / `outcome`，或 dashboard 的 Metrics → Errors → Invocation Statuses 里的 `Exceeded CPU Time Limits`。
- **R2 bucket 要先建**：`wrangler r2 bucket create workbench-r2`（`wrangler.jsonc` 的 `r2_buckets` 按名绑定到 `BLOB`，bucket 不存在时部署会报绑定解析失败）。它是生产环境的文件存储，本地 `.data/blob` 不会同步过去。
- 开发用本地 SQLite（`.data/db/sqlite.db`，`@nuxthub/core` 自动处理、无需环境变量），生产 D1 由 `NITRO_PRESET=cloudflare_module` 让 `hub.db` 切到 `d1` driver；d1 binding 模式不需要 `NUXT_HUB_CLOUDFLARE_*`（那是 `d1-http` driver 才需要）。Drizzle Kit 无独立配置，迁移文件在 `server/db/migrations/sqlite/`。
- `pnpm backup` 经 binding `DB` 从根 `wrangler.jsonc` 解析库名导出远程 D1 到 `db.sql`（已 gitignore），不依赖构建产物。

## 项目技能

`skills-lock.json` 锁定、装在 `.agents/skills/`：界面/组件/表单任务用 `nuxt-ui`；Cloudflare Workers/D1 开发用 `cloudflare`；运行或修改 wrangler 命令前用 `wrangler`。

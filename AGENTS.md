# Workbench Agent Instructions

个人自用的 Nuxt 4 书签、文件、笔记与记账应用：单用户密码登录，书签页为左右双树，文件页为文件树 + 预留预览区，笔记页为瀑布流卡片，记账页为按天分组的流水列表；书签节点及空白区域、文件树节点及空白区域、笔记卡片及空白区域、记账行及空白区域均通过右键打开上下文菜单。

技术栈：Nuxt 4、Nuxt UI v4、Nuxt Hub、Drizzle ORM + SQLite/Cloudflare D1、Tailwind CSS v4、TypeScript 6。个人自用、单用户、单浏览器。

- 纯客户端渲染（`nuxt.config.ts` 设 `ssr: false`）：不写 SSR 分支（`import.meta.server`），也不要指望服务端取数；`selfFetch` 的 401 跳转直接用 `window.location`。客户端渲染仍会由服务端渲染 app shell，所以页面请求走 Nuxt 渲染器——`nuxt.config.ts` 里的 `nitro.externals.inline` 是 Nuxt 4.6.0 的 Windows 回归（nuxt#36467）workaround：不加它，Windows 上所有页面请求 500（`Either manifest or precomputed data must be provided`）；官方修好后可移除。

## 功能

- **F1 登录**：单用户密码（环境变量 `NUXT_AUTH_PASSWORD`，即 `runtimeConfig.authPassword`）；校验通过后用 Nuxt 4.6 的 `useSession`（`nuxt/server`）写入 `nuxt-session` cookie（默认 httpOnly/secure/sameSite=lax，maxAge 1 天），密封用 Nuxt 的应用密钥 `NUXT_APP_SECRET`（≥32 字符，session 内部经 `deriveSecret` 读取）；除 `/api/auth/` 外所有 API 由 `server/middleware/auth.ts` 用 `getSession` 校验。
- **F2 书签数据**：一次拉全量，`sortBookmarks` 排序后 `buildTree` 组树——左树为所有文件夹及其子书签，右树为根级书签。
- **F3 双栏与节点菜单**：节点右键打开操作菜单，节点链接隐藏默认尾随箭头；左右面板及右键区域铺满视口高度，面板空白处右键新建（左：文件夹/书签，右：书签），无底部新建虚拟项。
- **F4 新建/编辑**：书签、文件夹各一个 create/edit 双模式弹窗；新建位置由服务端在 `POST /api/bookmarks` 计算（见「排序模型」），提交带 `submitting` 守卫防重复提交。
- **F5 删除**：非空文件夹拒绝删除；删除后同组剩余项整段重编号。
- **F6 移动**：Up / Down（同级一步）、To Top / To Bottom（同级首尾，整组一次重编号）、To Folder（跨父级，`MoveFormModal` 选目标父级，落到目标分组末尾）收在节点菜单的 **Move 二级菜单**里；分组首尾时对应子项 disabled，请求在途时整个 Move 菜单 disabled。
- **F7 排序位置模型**：见「前端架构约定」的「排序模型」「重编号实现」。
- **F8 请求与错误**：`selfFetch` 请求错误弹英文 toast，401 跳登录；`useSelfFetch` 是其 `useFetch` 封装。
- **F9 数据库**：见「数据库」；**F10 部署/备份**：见「部署」；**F11 文件**：见「文件存储」；**F12 工程配置与技能**：见「命令」「约束」「项目技能」。
- **F13 笔记**：`/notes` 瀑布流按 `createdAt` 倒序；空白处右键新建（无独立按钮），卡片左键进编辑、右键编辑/删除（无只读详情弹窗），删除不弹确认框；瀑布流与卡片细节见「Nuxt UI」。
- **F14 记账**：`/expenses` 是仅含「消费日期 / 金额 / 消费内容」三项的流水列表，按 `spentAt` 倒序，先按月分段（每月一张 `UCard` 显示该月合计），月内再按本地日期分成多张 `UCard`（header 显示日期与小计，body 是当天流水行）；消费只精确到天，表单用 `UInputDate` 显示/键入日期、尾部日历按钮弹 `UPopover` + `UCalendar` 选日期（存当天本地零点的毫秒时间戳）；金额以整数「分」存储（`amount`），界面出入都经 `formatAmount` / `parseAmount` 换算，不做元的浮点运算；空白处右键新建，行左键进编辑、右键编辑/删除，删除不弹确认框；页面骨架与笔记页一致（外层 `px-[25vw] py-[10vh] h-screen`，滚动区 `h-full overflow-y-auto` 并用 Tailwind 内置的 `scrollbar-none` 隐藏滚动条）。

## 目录职责

- `app/pages/`：`bookmarks.vue`（双树）、`files.vue`（文件树 + 预览区）、`notes.vue`（瀑布流）、`expenses.vue`（记账流水）、`login.vue`；`index.vue` 重定向 `/bookmarks`（`nuxt.config.ts` 的 routeRules 同款）。
- `app/components/`：`FileTree`、`FileUploadModal`、`BookmarkFormModal`、`FolderFormModal`、`MoveFormModal`、`NoteFormModal`、`ExpenseFormModal`、`PageNav`、`LoginForm`。
- `app/composables/`：数据 `useBookmarks` / `useFiles` / `useNotes` / `useExpenses`，弹窗状态 `*Form`，删除 `useDelete*`，排序 `useReorderBookmarks`，右键菜单 `*Menu`，各自独立、互不混合。
- `app/utils/`：`selfFetch` / `useSelfFetch`（请求与错误）、`bookmark-tree`（排序/组树）、`bookmark-menu`（书签与文件夹共用的 Move 子菜单）、`money`（分与元的换算）、`datetime`（日期/月份显示格式、「YYYY-MM-DD」↔ 当天零点毫秒时间戳的互转）。
- `server/`：`api/{auth,bookmarks,files,notes,expenses}`、`utils/{renumber,blob-files,blob-tree}`、`db/schema.ts` 与 `db/migrations/sqlite/`。
- `shared/types/`：前后端共享类型（`db.ts`、`files.ts`）。

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
- `pnpm-workspace.yaml` 启用 `trustPolicy: no-downgrade`：Nuxt 4.6 的 `@nuxt/vite-builder` 依赖 `cssnano ^9.2.2`，而 cssnano 9 / postcss-* 家族换发布流程后只剩 provenance、没有 npm trusted-publisher 证据，会被该策略判为 trust downgrade 并中断安装，故在 `trustPolicyExclude` 里按包名（`cssnano*`、`postcss-*`、`stylehacks`、`css-declaration-sorter`）排除；以后升级这些包若再报 `ERR_PNPM_TRUST_DOWNGRADE`，按同样方式补排除项
- `pnpm dev` 启动后支持 HMR，修改前端代码无需重新构建或重启
- 本地密钥配置在 `.env`（已被 gitignore，模板见 `.env.example`）：`NUXT_AUTH_PASSWORD`（登录密码）与 `NUXT_APP_SECRET`（≥32 字符随机串，Nuxt 应用密钥，用于密封 session）
- 无测试框架，无 CI 配置

## API 要点

路由按 Nuxt 文件路由落在 `server/api/**`（文件名即方法与路径），可自行查看；只有下列边界不明显：

- 除 `/api/auth/*` 外所有 API 都需登录（`server/middleware/auth.ts`）。
- `reorder` / `move` 是静态路由，优先于 `[id]` 动态路由匹配。
- `PUT /api/bookmarks/move`：`db.batch()` 里「源分组重编号 → 更新 parentId → 目标分组重编号」原子完成，目标分组写最后（所以同父级移动也正确）；400 拒绝 parentId 等于自身、id 不存在、把文件夹移进自己的子孙。
- `DELETE /api/bookmarks/:id`：删除与同组剩余项重编号在同一个 `db.batch()` 里原子完成。
- `PUT /api/bookmarks/reorder`：不校验 ids 覆盖度，由调用方保证传完整分组（见「重编号实现」）。
- `PUT /api/bookmarks/:id`：只更新 `name` / `url`；`type` / `parentId` / `position` 是结构性字段，分别由创建、`move`、`reorder` 维护，编辑接口不动它们。
- `POST /api/bookmarks`：`position` 由服务端按目标 `(parentId, type)` 分组计算（`max(position) + 1`，空分组为 1），客户端不提交 `position`。
- `GET /api/bookmarks`：按 `(parentId, type, position)` 返回，顺序自洽；客户端仍以 `sortBookmarks` 为准，不依赖该顺序。
- `PUT /api/notes/:id` 只改 content、`createdAt` 不动；`DELETE /api/notes/:id` 不做存在性预检（删 0 行，幂等）。
- `expenses` 的 CRUD 与 notes 同形；`GET /api/expenses` 按 `spentAt DESC, id DESC` 返回，`PUT /api/expenses/:id` 三个字段都可改（补记/改时间）。

## 数据库

- 开发环境使用本地 SQLite（由 `@nuxthub/core` 自动处理），文件位于 `.data/db/sqlite.db`，无需配置环境变量
- 生产环境为 Cloudflare D1：构建时 `NITRO_PRESET=cloudflare_module` 使 `hub.db` 自动切换 `d1` driver
- D1 绑定在 `wrangler.jsonc` 中通过 `database_name` 按名声明（binding 名 `DB`，无需维护 UUID），构建时 nitro 合并进 `.output/server/wrangler.json`，并由 `@nuxthub/core` 自动补充 `migrations_table`/`migrations_dir`
- D1 binding 模式（driver `d1`）不需要 `NUXT_HUB_CLOUDFLARE_*` 环境变量（那是 `d1-http` driver 才需要）
- Drizzle Kit 无独立配置文件，由 `@nuxthub/core` 自动处理
- 迁移文件位于 `server/db/migrations/sqlite/`

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

| 字段      | 类型    | 说明                             |
| --------- | ------- | -------------------------------- |
| id        | integer | 主键，自增                       |
| content   | text    | 笔记正文（必填，纯文本保留换行） |
| createdAt | integer | 创建时间，毫秒时间戳             |

没有 `position`：瀑布流顺序完全由 `createdAt` 决定，不需要书签那套分组重编号。

### 表结构：expenses

| 字段    | 类型    | 说明                                 |
| ------- | ------- | ------------------------------------ |
| id      | integer | 主键，自增                           |
| item    | text    | 消费内容（必填）                     |
| amount  | integer | 金额，整数「分」（不是元）           |
| spentAt | integer | 消费日期，存当天本地零点的毫秒时间戳 |

`amount` 存分是为了避开 SQLite `real` 的 IEEE754 浮点误差（`0.1 + 0.2` 不精确），累加小计才可靠。没有 `category` / `note` / `position`：当前只记三项，列表顺序由 `spentAt` 决定。

## 文件存储

- 文件对象走 NuxtHub Blob Storage（`hub.blob: true`），服务端统一使用 `@nuxthub/blob` 的 `blob.list / get / put / delete`，**不直接读取 `event.context.cloudflare.env` 下的 R2 binding**
- driver 由 `@nuxthub/core` 按 hosting 自动选择：本地 `pnpm dev` 使用 `fs` driver（目录为 `hub.dir` 下的 `blob/`），Cloudflare 构建使用 `cloudflare-r2` driver（binding 名 `BLOB`）
- `wrangler.jsonc` 声明 R2 绑定时必须使用 binding 名 `BLOB`，与 driver 默认 binding 一致；否则生产环境会报 `R2 binding "BLOB" not found`
- 本地 Blob 目录不会自动同步到线上 R2，两边数据独立
- `server/utils/blob-tree.ts` 的 `buildFileTree` 只负责把 `BlobObject.pathname` 按 `/` 拆成文件树，不接触具体 driver；前端 `FileTree.vue` 统一给文件使用 `i-lucide-file`、文件夹使用 `i-lucide-folder`，并为文件和文件夹提供右键菜单
- 文件图标不区分扩展名，统一由前端 `FileTree.vue` 渲染 `i-lucide-file`
- 上传走**分片上传**：服务端是 `server/api/files/multipart/[action]/[...pathname].ts`，内容就是 `blob.handleMultipartUpload(event)`；客户端用官方 `useMultipartUpload` 按 `/create` → `/upload/<pathname>` → `/complete/<pathname>` 调用，`pathname` 由 `prefix` + 文件名拼出。分片按片缓冲（`streamToArrayBuffer(stream, contentLength)`），所以内存占用约等于一片（10MB），**不受 Workers 128MB 内存上限和单请求 100MB 体积上限约束**，比旧的「整个请求体流式写入」更适合大文件，并且自带进度、失败重试（`maxRetry`）和 `abort()`
- **不要退回单请求整体上传**：不论是 `readMultipartFormData`（整份读进内存，峰值是文件大小的 2~3 倍，几十 MB 就会触发 Workers 的 128MB 限制、报[错误 1102](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1102/)），还是「把请求体流交给 `blob.put`」（会报 `Provided readable stream must have a known length`，必须补 `FixedLengthStream`）——这两条路都已经淘汰，它们只在本地 Node 下看不出问题
- `useMultipartUpload` 内部使用自己的 `ofetch`，**不走 `selfFetch`**；上传失败由 multipart composable 自身处理，不额外挂载全局 Toast 回调
- **`completed` 只 resolve 不 reject**：`useMultipartUpload` 在重试耗尽后是 `Promise.all` 里 catch 掉再 `return`，所以成功 resolve `complete` 的返回值、失败 resolve `undefined`。`useFiles.upload` 必须判空并抛错，否则上传失败会被当成成功（弹窗照常关闭并 refresh）
- **同名文件默认覆盖**：multipart 上传不在 `create` 阶段检查目标是否已存在；`complete` 会直接写入同名 key 并覆盖原文件
- **并发策略：本地与线上统一串行**（`concurrent: 1`）。本地 fs driver 的分片状态是本地 JSON 文件，每个分片请求都要「读它 → 改 → 整个写回」，并发会出现三类问题：多个请求同时读改写同一文件互相覆盖、`writeFile` 先截断再写导致别的请求读到半截 JSON（`JSON.parse` 失败）、失败重试把同一分片号重新入队造成重复上传——任一条都会报 `Multipart upload not found`（这个错名有误导性，它同时覆盖了「文件不存在」和「JSON 解析失败」）。线上 R2 虽由服务端维护分片状态，但为保持两端上传参数与并发行为一致，也使用串行上传。
- **本地中断上传会留残留**：fs driver 的分片元数据就写在 blob 目录里（`<pathname>.mpu.<uploadId>.json` 和 `.mpu.<uploadId>/分片文件`），而 `walkDir` 把它们当普通对象列出来——本地 `pnpm dev` 中途关页面／刷新会让这些垃圾节点出现在文件树里并永久保留（正常 complete 会删掉，重试耗尽时库会 `abort`）。线上 R2 的分片状态在服务端，没有这些文件；清理就是手动删掉 `.data/blob` 下对应的 `*.mpu.*.json` 和 `.mpu.*` 目录
- **`partSize × concurrent` 就是服务端内存峰值**：`createGenericMultipartUploadHandler` 对每个分片做 `streamToArrayBuffer(stream, contentLength)`，整片进内存。当前 10MB × 1 = 10MB，Workers 上限 128MB（per-isolate，还要装应用本身和其它请求）。并发当前固定为 1；提高 `partSize` 会线性增加内存占用与重传代价
- **不要用服务端 prefix 前缀列举**：`server/utils/blob-files.ts` 的 `listBlobs(prefix)` 是「拉全量 + 内存按前缀过滤」。`@nuxthub/blob` 的 fs driver 把 `list` 的 prefix 当目录名处理（`join(dir, prefix)`），传文件 key 会以「读目录」失败返回空列表，传 `docs/` 这类带斜杠的目录也不一定命中，结果是删除「接口成功但什么都没发生」。前缀过滤统一走 `listBlobs(prefix)`（内部就是「拉全量 + 内存过滤」两步，不再单独暴露 `listAllBlobs` / `filterByPrefix`），前缀尾部斜杠会被剥掉再比较，并只匹配 `${base}/` 下的对象，避免误匹配同名文件 `docs` 或 `docs-other.txt`；`tree.get.ts` 直接用 `listBlobs('')`，`delete.delete.ts` 用 `listBlobs(path)` 取整棵子树；R2 driver 的 `list({ prefix })` 本身是正常的，但为了两端一致也走同一个函数
- 下载走 `server/api/files/download.get.ts`：`blob.head` 取大小（不存在时自抛 404）→ 超过 `MAX_SIZE`（64MB，因为 `blob.serve` / driver 的 `get` 是整份读进内存，为 Workers 预留空间）返回 413 → `blob.serve(event, path)` 流式返回。**`Content-Disposition` 头值只能是 latin1**，中文名直接写进 `filename=` 会让 Node / Workers 的头校验抛 `ERR_INVALID_CHAR`、整个下载 500，所以 ASCII 名回退一份、真正的名字走 RFC 5987 的 `filename*=UTF-8''`
- 删除走 `server/api/files/delete.delete.ts`：key 以 `/` 结尾（文件夹）时用 `listBlobs(path)` 收集整棵子树再一次性 `blob.del(keys)`，否则直接 `blob.del(path)`；两个 driver 的 delete 都忽略不存在的 key，故不做存在性校验（幂等，也不需要考虑「别人先删了」）。handler 不写 return：Nitro 用 `preemptive` router，`undefined` 会被转成 `null` → 204
- 上传弹窗（`FileUploadModal.vue`）收文件 + 路径前缀 + 上传进度条。最终 key 是 `prefix/文件名`；路径为空就是根目录；在文件夹里上传时路径默认是该文件夹的 `key`，用户可以继续往后追加一层（如 `documents/photos`），**新增的层不需要预先存在**，上传后自然会出现在树里——这就是替代「新建文件夹」的做法。上传期间路径输入与文件选择都 disabled，避免中途改 key
- 前端 `useFiles` 的 `upload(key, file, onProgress)` 把 key 的目录部分交给 `useMultipartUpload` 的 `prefix`（`key.slice(0, -文件名)`），文件本体直接用 `File`——create 内部就是按 `file.name` 拼 pathname，不需要再包一层 `new File`；进度的 `watch(progress)` 建在事件处理器的调用栈里（不在 setup 作用域），不会随组件销毁自动停止，所以 `upload()` 里用 `try/finally` 手动 `stop()`；库上报的是「已完成片数 / 总片数」且先赋值再 `push`（滞后一片），要按 `chunks` 换算成正在传的那一片，否则小于一片的文件全程 0%、多片文件最多停在 `(n-1)/n`；上传弹窗通过 `upload` prop 注入，**不要在弹窗里再调一次 `useFiles()`**——那会在同一 key 上重复发起 `useSelfFetch('/api/files/tree')`，Nuxt 去重取消其中一个请求并抛 `AbortError: AsyncData request cancelled by deduplication` 并被全局 toast 弹出来
- 右键菜单靠 token class 定位节点：`UTree` 只把 `item.class` 透传到带 `data-slot="link"` 的元素上、不转发任意属性，所以 `FileTree.vue` 的 `buildTreeItems` 组树时给每个节点挂 `file-node-<n>` 类并同时建 `token → node` 的 Map，`@contextmenu` 里 `closest('[data-slot="link"]')` 取类名再查 Map（拿不到类名就当成空白处，弹根级菜单）；升级 Nuxt UI 时要重新核对 `item.class` 是否仍落在 link 元素上
- `files.vue` 的文件树区域铺满左侧栏并支持空白处右键上传，右侧是**预留的空白预览区**（还没有选中/预览逻辑，不维护 selected 状态）；页面用 `flex h-screen`（而不是书签页的 `min-h-screen flex`）——树要撑满视口高度，下方空白处才能右键上传，所以子元素要用 `h-full`；`FileTree` 的 `items` 收 `TreeItem[]`，只负责展示与右键菜单，不向外抛选中事件
- 服务端不校验 prefix 是否存在，也不校验它是不是已存在的目录（只拦同名文件）

## 前端架构约定

- **删除刷新时序**：`useDeleteBookmark` / `useDeleteFolder` / `useDeleteNote` / `useDeleteFile` / `useDeleteExpense` 都在 DELETE 成功后立即调用传入的 `refresh()`（不 await），随后提示成功；即「删除类 composable 统一收一个 `refresh` 回调」。
- **文案语言与页面导航**：所有页面的菜单、弹窗、提示等界面文案统一使用英文（Toast 也是英文，`selfFetch` 的错误提示见 F8）；代码注释仍用中文。各页面右下角统一渲染 `PageNav`（`fixed bottom-4 right-4` 的竖排仅图标按钮，按 `useRoute().path` 过滤掉当前页、只留其他页互跳），页面自己不再写导航按钮
- **弹窗操作按钮**：所有弹窗的操作按钮统一放在 `UModal` 的 `#footer`、右对齐，外层固定用 `<div class="flex justify-end gap-2 w-full">`。表单弹窗的按钮不在 `<UForm>` 内，所以不用 `type="submit"`，而是给 `UForm` 挂 `ref="formRef"`（`const formRef = useTemplateRef<{ submit: () => Promise<void> }>('formRef')`），footer 的按钮用 `@click="formRef?.submit()"`——`UForm.submit()` 会先跑校验再触发 `@submit`，校验链路（如书签/文件夹的 `:validate`）不受影响。登录页的 `UAuthForm` 提交按钮是整行宽（`block`），不在此列
- **笔记页瀑布流**：用 `UScrollArea` 的 `virtualize` + `lanes`（`{ lanes, gap: 16, estimateSize: 180 }`），这是 Nuxt UI 官方的 masonry 用法——`virtualize` 打开分道虚拟滚动，`lanes` 给列数，`estimateSize` 只是首屏估算、真实高度由库对每项做 `measureElement`。`lanes` 是 `ref`，由 `window.innerWidth` 的 resize 监听算成 1/2/3（笔记页内容左右对称留白 `px-[25vw]` 居中、剩 50vw；书签/文件页的 `pl-[30vw] pr-[20vw]` 偏右是给树留的，笔记页不需要）；**不要退回 CSS multi-column**（`columns-*` + `break-inside-avoid`）：那是本项目引入 Nuxt UI 瀑布流之前的写法，列平衡与卡片定位都更笨拙
- **笔记卡片的右键定位**：卡片是页面自己渲染的 DOM，直接挂 `data-note-id`，`@contextmenu` 里用 `closest('[data-note-id]')` 反查记录；**不要照搬书签/文件树的 token class + Map 方案**——那是 `UTree` 只透传 `item.class`、不转发任意属性导致的变通。`closest` 取不到就是空白处 → 根级菜单（新建笔记）。右键处理器里**不能 `event.stopPropagation()`**：Reka 的 ContextMenuTrigger 要靠事件冒泡到触发元素才会在指针位置打开菜单
- **笔记卡片的预览**：卡片正文 `max-h-40 overflow-hidden`（`text-sm` 行高 20px，160px 正好 8 行）在**整行处裁断**，既不加 `line-clamp` 的省略号（代码类文本结束后挂个 `...` 很难看），也不加渐隐；完整内容靠左键 `@click` 直接打开**编辑**弹窗（`noteForm.openEdit`），与右键菜单的「Edit」是同一个入口，**没有单独的只读详情弹窗**；卡片是 `cursor-pointer`，悬停时显示手型光标。新建/编辑弹窗的 `UTextarea` 固定 `:rows="20"`（配 `:ui="{ base: 'resize-none' }"`、不加 `autoresize`），内容超出后文本框自己出滚动条。卡片高度必须有上界，虚拟瀑布的 `estimateSize` 与 `measureElement` 都指望它
- **删除一律不弹确认框**：书签 / 文件夹 / 笔记 / 文件（含文件页的文件夹，会整棵删除）都是菜单项一点即删，没有确认弹窗、也没有撤销——个人自用项目刻意保持简单；删除菜单项统一用 `color: 'error'` + `i-lucide-trash-2`（标红）
- **笔记顺序只由服务端给**：`createdAt` 由服务端写 `Date.now()`、编辑不改，顺序完全取自 `GET /api/notes` 的 `ORDER BY createdAt DESC, id DESC`，页面不做客户端排序（书签那套 `sortBookmarks` 是 position 模型专用的）
- **单一职能 + 依赖注入**：数据（`useBookmarks` / `useFiles` / `useNotes`）、弹窗状态（`*Form`）、删除（`useDelete*`）、排序（`useReorderBookmarks`）、菜单（`*Menu`）各自独立、互不混合；书签/文件夹的新增、编辑、删除全部分离（即使代码相似也不合并），移动弹窗状态独立成 `useMoveForm`。页面（`bookmarks.vue`）实例化 composable 后以参数注入菜单（如 `useFolderMenu(bookmarkForm, folderForm, removeFolder, reorder)`），菜单内部不自行实例化状态类 composable
- **排序模型**：分组键为 `(parentId, type)`，同组内 `sortBookmarks` 恒定「文件夹优先」→「position 升序」，因此 UI 中一段连续可视区间恰好等于一个分组。客户端排序是唯一权威（`leftTree` / `rightTree` 都经 `sortBookmarks`），不依赖 `GET /api/bookmarks` 的返回顺序。移动**只做整段重编号**（按新顺序把 position 写回 `1..n`），**永不交换 position 值**——历史数据的 position 是全局计数器留下的，可能带偏移和间隙，交换语义未定义且无法自愈。新建位置由服务端计算：`POST /api/bookmarks` 写入前取目标 `(parentId, type)` 分组的 `max(position) + 1`（空分组为 1），客户端不再计算或提交 `position`；编辑不改 `position`。历史数据无需预先迁移，删除或移动时会将目标分组整段归一化为 `1..n`
- **重编号实现**：必须走 `server/utils/renumber.ts` 的 `renumberGroupQuery(parentId, type, orderedIds)`，它用 SQLite JSON1 的 `json_each` 把顺序当参数传入，**语句数恒为 1、绑定参数为常数个且最多 4 个，与分组大小 N 无关**。不要改回「每行一条 UPDATE」（随 N 线性增长，会撞 D1 每批语句数限制），也不要改成「单条 CASE」（要 2N 个绑定参数，会撞 D1 每查询 100 个绑定参数的限制）。**调用方必须传入该分组的完整成员**——服务端不做覆盖度校验，漏传的行不会被更新
- **移动能力查询成本**：`useReorderBookmarks` 的 `located` computed 预先构造 `id → { item, group, index }` 映射，`locate` 只做 Map 查找。不要在 `canMove` / `locate` 内重排或扫描全量数据；以往扫描造成的约 16ms/次开销是优化此处的原因。
- **移动的两条通道**：同父级内走 `PUT /api/bookmarks/reorder`（`useReorderBookmarks` 负责）；跨父级走 `PUT /api/bookmarks/move`，由 `MoveFormModal` 自己发请求（与 `BookmarkFormModal` / `FolderFormModal` 一致：弹窗发请求 + `emit`，页面在 `@moved` 上 `refresh`），所以 `useReorderBookmarks` 里没有跨父级的函数。
- **四个同级移动共用一套逻辑**：`move(id, direction)` / `canMove(id, direction)` 的 direction 是 `up | down | top | bottom`——「走一格」和「到首/尾」只是**目标下标**不同（`{ up: index - 1, down: index + 1, top: 0, bottom: group.length - 1 }`），所以没有单独的 `moveToEdge` / `canMoveToEdge`，也**不要用循环调 `move` 来实现移到首/尾**（一次整组重编号即可）。`move` 开头会先 `canMove` 一次：已在两端时 `up` 会算出 `target = -1`，而 `splice(-1, 0, id)` 会把它插到倒数第二位、静默写坏顺序。
- **节点菜单的 Move 是共用的二级菜单**：`app/utils/bookmark-menu.ts` 的 `moveMenuItem(bookmark, reorder, moveForm)` 返回一个带 `children` 的子菜单项，同时给书签菜单和文件夹菜单用（各写一份会随项数增加越来越难同步）；`menuBookmark(item)` 是共用的取值器（树节点把原始记录挂在 `_bookmark` 上）。一级菜单因此只有 4~5 项。整个 Move 在请求在途时 disabled，子项各自的 `canMove` 判定照旧。
- **跨父级移动的目标候选**：页面用 `buildFolderTree(data, item)` 算出文件夹树（只含文件夹、按层级嵌套、同级按 position），注入 `MoveFormModal`；「根级」是弹窗自己补在最前面的虚拟节点（`value: null`）。传进去的是即将被移动的那条记录，util 内部只剪掉**它自己**：子孙只在从被保留的节点往下递归时才被访问，所以天然进不来——不剪则会成环，`buildTree` 里成环的行都成不了 root，整棵子树从界面消失且再也点不到；服务端在 `move.put.ts` 里也会再拒一次。
- **错误处理（fail loudly）**：`selfFetch` 已在全局统一弹出错误 toast，业务代码**不写 try/catch 包裹请求**；失败时异常自然传播（unhandled rejection 即预期表现），成功路径（emit/refresh/toast）不执行

## Nuxt UI

- 图标使用 `@iconify-json/lucide` 集，格式如 `i-lucide-*`
- 项目实际使用的组件：`UApp`、`UModal`、`UForm`、`UTree`、`UDropdownMenu`、`UContextMenu`、`UInput`、`UInputDate`、`UTextarea`、`UCard`、`UScrollArea`、`UButton`、`UFormField`、`UAuthForm`、`UPopover`、`UCalendar`
- **记账页的日期选择器**：`UInputDate` 负责显示/键入，尾部 `#trailing` 放日历图标按钮触发 `UPopover`，`#content` 里是 `UCalendar`，选完自动 `close`；`UPopover` 的 `:reference` 借 `UInputDate` 暴露的 `inputsRef[3]?.$el` 定位（同官方 date picker 示例），取不到时回退到按钮本身。两个组件的空值类型不同（`UInputDate` 用 `null`、`UCalendar` 用 `undefined`），所以表单里各配一个 computed、共用同一份 `YYYY-MM-DD` 字符串；日期对象来自 `@internationalized/date`（`UInputDate`/`UCalendar` 的 peer 依赖，已在 `dependencies` 声明）
- **`UScrollArea` 的 `virtualize` 需要自己的高度**：它自带 `overflow-y-auto`（主题的 root 槽），页面里必须给定高度（笔记页是外层 `h-screen` + 子元素 `h-full`），否则没有滚动容器、虚拟列表量不出视口。`items` 传数组、用默认插槽的 `{ item }` 渲染，虚拟化分支下每项是绝对定位的 `data-slot="item"` 包装，槽里的内容决定实际高度；`@tanstack/vue-virtual` 是 `@nuxt/ui` 自己的依赖，不需要在 package.json 里再声明
- 卡片用 `UCard`（默认 `outline` 变体：`bg-default ring ring-default`），但在笔记页必须加 `:ui="{ root: 'ring-inset' }"`——`UScrollArea` 的 root 是 `overflow-y-auto overflow-x-hidden`，而 `ring` 是画在卡片边框盒之外的 box-shadow，首行/末行/最左列/最右列卡片的描边落在滚动容器内容边界上会被裁掉；`ring-inset` 把描边画进卡片内部，滚动与测量都不受影响；记账页的分组列表也用 `UCard`：日期与小计放进 `#header`（`root` 的 `divide-y` 自动分隔 header 与 body）；`:ui` 里 `root: 'ring-inset'`、`body: 'p-0 divide-y divide-default'`（`divide-y` 落在 body 的直接子元素即各行上承接分隔线），header 的主题内边距（`p-4 sm:px-6`）按需覆盖——注意 `sm:px-*` 要单独再覆盖一次才会在 sm 断点生效，只写 `p-0` 会残留主题的 `sm:px-6`；`ring-inset` 则避免描边被滚动容器（`overflow-y-auto` 会把 `overflow-x` 连带变成 `auto`）裁掉。不要手写 `ring-default` / `bg-default` 这类语义色 class 去拼表面；没有笔记时显示空白页，不放空状态组件
- `UTree` 没有拖拽能力（底层 Reka `TreeRoot` 亦无），排序只用右键菜单的移动项实现
- **`UTree` 单选时 `modelValue` 收的是 item 对象本身**（Reka 内部用 `getKey` 比较，不比较引用），传对应节点对象进去就有主题默认的选中样式（`selected` 变体给的是 `before:bg-elevated` 底色 + `text-highlighted`，hover 还有 `hover:before:bg-elevated/50`）。选中样式统一由 `ui.link` 覆盖决定，两处不一样：书签页的树是导航，`treeLinkUi` 把底色和文字色一起去掉（`hover:text-inherit hover:before:bg-transparent before:bg-inherit text-inherit`）；移动弹窗是选择器，底色同样去掉，但**必须留一个选中标记**，所以多了 `aria-selected:text-primary`（选中行文字变主题色、其余行 `text-inherit`，悬停不上色以免和选中混淆）——`aria-selected` 是 UTree/Reka 打在节点上的，不需要额外 data 属性。两份 `ui` 各写一遍、不抽常量。**别把书签页那份里的 `linkTrailingIcon: 'hidden'` 抄进弹窗**：那是隐藏导航箭头的，选择器要靠箭头看展开/折叠
- **点击 `UTree` 节点会同时触发选中与折叠/展开**（Reka `TreeItem` 的 onClick 先 select 再 toggle），没有单独的展开按钮。所以移动弹窗给有子节点的项设了 `defaultExpanded: true`，目标一次全部可见、点一下即可选中（这也意味着点父级会顺手折叠它）
- **`UTree` 的 `get-key` 会被塞一个空对象**：Reka 用 `getKey(modelValue ?? {})` 探测「当前没有选中」，所以 `get-key` 必须对 `{}` 也安全——`bookmarks.vue` 写成 `String(menuBookmark(item)?.id)`。写成 `menuBookmark(item).id` 会在树挂载时抛 `Cannot read properties of undefined (reading 'id')`、**整页白屏**（这个坑真踩过一次：`String(undefined)` 无害，但多一层 `.id` 就不是了）
- **`UDropdownMenu` 的 item 带 `children` 就渲染成二级菜单**（内部是 `DropdownMenu.Sub` / `SubTrigger`，自带右侧箭头，`SubTrigger` 上的 `disabled` 会连子菜单一起禁用，子项的 `onSelect` 照常生效）。鼠标悬停由 `pointermove` + 100ms 定时器触发打开；`UContextMenu` 走的是同一个 content 组件，所以右键菜单里也能用子菜单
- **弹窗尺寸按需在实例上写 `ui`**：`UModal` 没有 `size` 之类的 prop，宽度只能由 `ui.content` 覆盖（主题默认 `max-w-lg`，512px）；表单/上传/删除弹窗都用默认值，移动弹窗传 `:ui="{ content: 'max-w-2xl' }"`（672px，候选树宽一点更好读）、笔记的新建/编辑弹窗传 `max-w-4xl`（896px，长文输入更舒服）。移动弹窗的候选树容器是 `max-h-96`（384px）：候选树是整棵展开的（本地数据实测内容高约 1100px），再高会顶到弹窗自身的视口上限，超出部分由容器自己滚动。`ui.content` 与主题里的 `max-w-lg` 冲突由 tailwind-merge 解决，主题的 `bg-default` / `rounded-lg` / `ring` 等类都保留
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
- R2 bucket 也要先建：`wrangler r2 bucket create workbench-r2`（`wrangler.jsonc` 的 `r2_buckets` 按名绑定到 `BLOB`，bucket 不存在时部署会报绑定解析失败）；它是生产环境的文件存储，本地 `.data/blob` 不会同步过去
- 部署命令 `pnpm deploy` 通过 `cross-env` 跨平台设置 `NITRO_PRESET=cloudflare_module`，然后执行：构建 Nitro preset `cloudflare_module` → `wrangler deploy --keep-vars` → 应用 D1 迁移（`wrangler --config .output/server/wrangler.json d1 migrations apply DB --remote`）
- `wrangler deploy` 从根目录运行，经构建生成且已被 gitignore 的 `.wrangler/deploy/config.json` 重定向到 `.output/server/wrangler.json`；迁移命令需显式 `--config .output/server/wrangler.json`（`migrations_dir` 为相对该文件的 `db/migrations/sqlite/`）
- 部署前提：wrangler 已认证（`wrangler login`，或设置 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` 环境变量）
- 生产密钥：`wrangler secret put NUXT_AUTH_PASSWORD`（登录密码）与 `wrangler secret put NUXT_APP_SECRET`（≥32 字符随机串，可用 `openssl rand -base64 32` 生成）；两者与本地 `.env` 的值独立，`--keep-vars` 不会覆盖 secrets。旧的 `AUTH_SECRET` 可 `wrangler secret delete AUTH_SECRET` 删除
- `pnpm backup` 导出远程 D1 到 `db.sql`（已被 gitignore），经 binding `DB` 从根 `wrangler.jsonc` 解析库名，不依赖构建产物

## 约束

- 这是个人自用项目：单用户、单浏览器操作，数据来源和使用流程都在自己掌控内。按现有代码的写法实现，**不要为假想场景增加防御代码、重复校验、无意义的状态分支或多余的 `try/catch`**；只在真实的外部边界处理错误。
- 优先使用现有技术栈和模块，在现有文件中完成修改；保持实现简单、直接、可读，优先让正常流程直观，不为小功能增加额外抽象、通用层或复杂架构。
- 遵循现有命名、目录职责和数据流，不擅自改变已有 API、配置字段或模块边界。
- 页面请求优先走 `selfFetch` / `useSelfFetch`；样式使用 Tailwind class 与 Nuxt UI 的 `ui` 属性。
- `try/finally` 是允许的：它没有 `catch`，不吞异常，仅用于复位状态（如 `moving`、`submitting`），不违反 fail-loudly 约定。
- ESLint 使用 `@antfu/eslint-config`（已启用 formatters 与 vue 规则），不支持 Prettier（`.vscode/settings.json` 已禁用）；style/format 类规则与引号、分号由 ESLint 自动修复，保存时自动执行。
- 每次修改代码后必须执行 `pnpm lint` 和 `pnpm typecheck`，不得新增错误。
- 禁止使用 `pnpm lint:fix`；只用 `pnpm lint` 检查，并且只修复本次修改相关代码的错误。
- **代码修改后必须同步更新本文件**：新增、修改或删除文件时（组件、composable、页面、API、工具函数、配置等），立即更新**功能**、**目录职责**、**API 要点**等对应章节，确保文档始终反映最新代码。
- 不将构建产物、缓存、依赖与本地数据纳入 Git（`.output`、`.nuxt`、`.data`、`node_modules`、`.env`、`db.sql`、`.wrangler`）。

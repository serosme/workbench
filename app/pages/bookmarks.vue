<script setup lang="ts">
import type { DropdownMenuItem, TreeItem } from '@nuxt/ui'

const bookmarkForm = useBookmarkForm()
const folderForm = useBookmarkForm()
const moveForm = useMoveForm()
const { tree, refresh, data } = useBookmarks()
const { remove: removeBookmark } = useDeleteBookmark(refresh)
const { remove: removeFolder } = useDeleteFolder(refresh)
const reorder = useReorderBookmarks(data, refresh)
const { getMenu: getBookmarkMenu } = useBookmarkMenu(bookmarkForm, moveForm, removeBookmark, reorder)
const { getMenu: getFolderMenu } = useFolderMenu(bookmarkForm, folderForm, moveForm, removeFolder, reorder)

// 右栏文件树：上传弹窗只负责 UI，upload 由页面注入（弹窗内再调一次 useFiles 会重复请求同一个接口）
const { tree: fileTree, ready: filesReady, upload: uploadFile, refresh: refreshFiles } = useFiles()
const fileUploadForm = useFileUploadForm()
const { remove: removeFile } = useDeleteFile(refreshFiles)
const { getMenu: getFileMenu } = useFileMenu(fileUploadForm, removeFile)

// 移动弹窗的目标树：所有文件夹（移动文件夹时由 buildFolderTree 剪掉自己与整棵子树），根级由弹窗补在最前面。
const moveTargets = computed(() => buildFolderTree(data.value ?? [], moveForm.modal.item ?? undefined))

const contextBookmark = ref<Bookmark>()
const contextMenuItems = computed<DropdownMenuItem[][]>(() => {
  const b = contextBookmark.value
  if (!b) {
    return [[
      { label: 'New Folder', icon: 'i-lucide-folder-plus', onSelect: () => folderForm.openCreate() },
      { label: 'New Bookmark', icon: 'i-lucide-bookmark-plus', onSelect: () => bookmarkForm.openCreate() },
    ]]
  }
  return b.type === 'folder' ? getFolderMenu(b) : getBookmarkMenu(b)
})

const scrollRef = useTemplateRef<HTMLElement>('scrollRef')
const scrollMask = useScrollMask(scrollRef)

function withContextTokens(items: TreeItem[]): TreeItem[] {
  return items.map(item => ({
    ...item,
    class: `${item.class ?? ''} bookmark-node-${item.id}`.trim(),
    ...(item.children ? { children: withContextTokens(item.children) } : {}),
  }))
}

const contextTree = computed(() => withContextTokens(tree.value))

function openContextMenu(event: MouseEvent) {
  const link = (event.target as HTMLElement).closest('[data-slot="link"]')
  const id = Number(link?.className.match(/bookmark-node-(\d+)/)?.[1])
  contextBookmark.value = Number.isInteger(id) ? data.value?.find(b => b.id === id) : undefined
}

// UTree 会拿一个空对象来探测 key（Reka 内部是 `getKey(modelValue ?? {})`），所以这里不能假设收到的都是真节点。
function getItemKey(item: TreeItem): string {
  return String(item.id)
}
</script>

<template>
  <!-- 左书签与右文件树的请求都落地后才渲染两栏（不然两栏会先后出现、不同步），
       不用 status 判定：刷新时旧数据还在、不整页闪。两个请求在 setup 里并发发出，等待时间是两者的较大者。 -->
  <div v-if="data && filesReady" class="flex h-full">
    <aside class="flex h-full w-full min-w-0 flex-col pr-0 md:w-2/5 md:pr-6">
      <UContextMenu :items="contextMenuItems" class="block min-h-0 flex-1">
        <div ref="scrollRef" class="h-full min-h-32 overflow-y-auto scrollbar-none" :style="scrollMask" @contextmenu="openContextMenu">
          <UTree :items="contextTree" :get-key="getItemKey" :ui="treeNavUi" size="xl" />
        </div>
      </UContextMenu>
    </aside>

    <!-- 右栏是文件树：空白处右键上传，节点右键下载 / 删除 -->
    <section class="hidden h-full min-w-0 flex-1 flex-col border-l border-default pl-6 md:flex">
      <FileTree :items="fileTree" :get-menu="getFileMenu" />
    </section>

    <BookmarkFormModal
      v-model:open="bookmarkForm.modal.open"
      :parent-id="bookmarkForm.modal.parentId"
      :item="bookmarkForm.modal.item"
      @created="refresh"
      @updated="refresh"
    />
    <FolderFormModal
      v-model:open="folderForm.modal.open"
      :parent-id="folderForm.modal.parentId"
      :item="folderForm.modal.item"
      @created="refresh"
      @updated="refresh"
    />
    <MoveFormModal
      v-model:open="moveForm.modal.open"
      :item="moveForm.modal.item"
      :targets="moveTargets"
      @moved="refresh"
    />
    <FileUploadModal
      v-model:open="fileUploadForm.modal.open"
      :default-path="fileUploadForm.modal.defaultPath"
      :upload="uploadFile"
      @saved="refreshFiles"
    />
  </div>
</template>

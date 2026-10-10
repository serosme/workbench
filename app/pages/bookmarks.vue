<script setup lang="ts">
import type { DropdownMenuItem, TreeItem } from '@nuxt/ui'
import { buildFolderTree } from '~/utils/bookmark-tree'

const bookmarkForm = useBookmarkForm()
const folderForm = useBookmarkForm()
const moveForm = useMoveForm()
const { tree, refresh, data } = useBookmarks()
const { remove: removeBookmark } = useDeleteBookmark(refresh)
const { remove: removeFolder } = useDeleteFolder(refresh)
const reorder = useReorderBookmarks(data, refresh)
const { getMenu: getBookmarkMenu } = useBookmarkMenu(bookmarkForm, moveForm, removeBookmark, reorder)
const { getMenu: getFolderMenu } = useFolderMenu(bookmarkForm, folderForm, moveForm, removeFolder, reorder)

// 移动弹窗的目标树：所有文件夹（移动文件夹时由 buildFolderTree 剪掉自己与整棵子树），根级由弹窗补在最前面。
const moveTargets = computed(() => buildFolderTree(data.value ?? [], moveForm.modal.item ?? undefined))

const treeLinkUi = {
  link: 'hover:text-inherit hover:before:bg-transparent before:bg-inherit text-inherit',
  linkTrailingIcon: 'hidden',
}

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
  <div class="flex h-full">
    <!-- 左：书签树（文件夹在上，根级书签落在最下边） -->
    <aside class="flex h-full min-w-0 flex-col pr-6" style="width: 35%">
      <UContextMenu :items="contextMenuItems" class="block min-h-0 flex-1">
        <div class="h-full min-h-32 overflow-y-auto scrollbar-none" @contextmenu="openContextMenu">
          <UTree :items="contextTree" :get-key="getItemKey" :ui="treeLinkUi" />
        </div>
      </UContextMenu>
    </aside>

    <!-- 右：预留给 Chat -->
    <section class="h-full min-w-0 flex-1 border-l border-default pl-6" />

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
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem, TreeItem } from '@nuxt/ui'
import { menuBookmark } from '~/utils/bookmark-menu'
import { buildFolderTree } from '~/utils/bookmark-tree'

const bookmarkForm = useBookmarkForm()
const folderForm = useFolderForm()
const moveForm = useMoveForm()
const { leftTree, rightTree, refresh, data } = useBookmarks()
const { remove: removeBookmark } = useDeleteBookmark(refresh)
const { remove: removeFolder } = useDeleteFolder(refresh)
const reorder = useReorderBookmarks(data, refresh)
const { nextPosition } = reorder
const { getMenu: getBookmarkMenu } = useBookmarkMenu(bookmarkForm, moveForm, removeBookmark, reorder)
const { getMenu: getFolderMenu } = useFolderMenu(bookmarkForm, folderForm, moveForm, removeFolder, reorder)

// 移动弹窗的目标树：所有文件夹（移动文件夹时由 buildFolderTree 剪掉自己与整棵子树），根级由弹窗补在最前面。
const moveTargets = computed(() => buildFolderTree(data.value ?? [], moveForm.modal.item ?? undefined))

const treeLinkUi = {
  link: 'hover:text-inherit hover:before:bg-transparent before:bg-inherit text-inherit',
  linkTrailingIcon: 'hidden',
}
const contextBookmark = ref<TreeItem>()
const contextIsLeft = ref(true)
const contextMenuItems = computed(() => getMenu(contextBookmark.value, contextIsLeft.value))
let nodeToken = 0
const nodes = new Map<string, TreeItem>()

function getMenu(item: TreeItem | undefined, left: boolean): DropdownMenuItem[][] {
  if (!item) {
    const createItems: DropdownMenuItem[] = [
      ...(left ? [{ label: 'New Folder', icon: 'i-lucide-folder-plus', onSelect: () => folderForm.openCreate() } satisfies DropdownMenuItem] : []),
      { label: 'New Bookmark', icon: 'i-lucide-bookmark-plus', onSelect: () => bookmarkForm.openCreate() },
    ]
    return [createItems]
  }
  const b = menuBookmark(item)
  return b.type === 'folder' && left ? getFolderMenu(item) : getBookmarkMenu(item)
}

function withContextTokens(items: TreeItem[]): TreeItem[] {
  return items.map((item) => {
    const token = `bookmark-node-${nodeToken++}`
    nodes.set(token, item)
    return { ...item, class: `${item.class ?? ''} ${token}`.trim(), ...(item.children ? { children: withContextTokens(item.children) } : {}) }
  })
}

function openContextMenu(event: MouseEvent, left: boolean) {
  contextIsLeft.value = left
  const link = (event.target as HTMLElement).closest('[data-slot="link"]')
  const token = link?.className.match(/bookmark-node-\d+/)?.[0]
  contextBookmark.value = token ? nodes.get(token) : undefined
}

// UTree 会拿一个空对象来探测 key（Reka 内部是 `getKey(modelValue ?? {})`），所以这里不能假设收到的都是真节点。
function getItemKey(item: TreeItem): string {
  return String(menuBookmark(item)?.id)
}

const contextLeftTree = computed<TreeItem[]>(() => withContextTokens(leftTree.value))
const contextRightTree = computed<TreeItem[]>(() => withContextTokens(rightTree.value))
</script>

<template>
  <div class="pl-[30vw] pr-[20vw] py-[10vh] flex h-screen">
    <PageNav />
    <div class="w-1/2 min-w-0 h-full">
      <UContextMenu :items="contextMenuItems" class="block h-full">
        <div class="h-full min-h-32 w-full" @contextmenu="openContextMenu($event, true)">
          <UTree :items="contextLeftTree" :get-key="getItemKey" :ui="treeLinkUi" />
        </div>
      </UContextMenu>
    </div>
    <div class="w-1/2 min-w-0 h-full">
      <UContextMenu :items="contextMenuItems" class="block h-full">
        <div class="h-full min-h-32 w-full" @contextmenu="openContextMenu($event, false)">
          <UTree :items="contextRightTree" :get-key="getItemKey" :ui="treeLinkUi" />
        </div>
      </UContextMenu>
    </div>
    <BookmarkFormModal
      v-model:open="bookmarkForm.modal.open"
      :mode="bookmarkForm.modal.mode"
      :parent-id="bookmarkForm.modal.parentId"
      :item="bookmarkForm.modal.item"
      :next-position="nextPosition(bookmarkForm.modal.parentId ?? null, 'bookmark')"
      @created="refresh"
      @updated="refresh"
    />
    <FolderFormModal
      v-model:open="folderForm.modal.open"
      :mode="folderForm.modal.mode"
      :parent-id="folderForm.modal.parentId"
      :item="folderForm.modal.item"
      :next-position="nextPosition(folderForm.modal.parentId ?? null, 'folder')"
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

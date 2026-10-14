<script setup lang="ts">
import type { DropdownMenuItem, TreeItem } from '@nuxt/ui'

const bookmarkForm = useBookmarkForm()
const folderForm = useBookmarkForm()
const moveForm = useMoveForm()
const { tree, refresh, data } = useBookmarks()
// 在页面里请求而不是丢给 ChatPanel：ChatPanel 挂在 `v-if` 之内，由它发起会让模型列表等书签返回后才开始请求（串行）
const { data: chatModels } = useSelfFetch<ChatModel[]>('/api/chat/models')
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
  <!-- 书签与模型列表都返回后才渲染两栏：否则右栏 Chat 会先出现、左栏书签树随后才补上，两栏显示不同步，Chat 的模型下拉还会从空再补齐。
       用 data 而不是 status，刷新时（data 还在）不会闪。两个请求在 setup 里同时发出，所以等待时间是两者的较大者。 -->
  <div v-if="data && chatModels" class="flex h-full">
    <aside class="flex h-full w-full min-w-0 flex-col pr-0 md:w-[35%] md:pr-6">
      <UContextMenu :items="contextMenuItems" class="block min-h-0 flex-1">
        <div class="h-full min-h-32 overflow-y-auto scrollbar-none" @contextmenu="openContextMenu">
          <UTree :items="contextTree" :get-key="getItemKey" :ui="treeLinkUi" size="xl" />
        </div>
      </UContextMenu>
    </aside>

    <section class="hidden h-full min-w-0 flex-1 border-l border-default pl-6 md:block">
      <ChatPanel :models="chatModels" />
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
  </div>
</template>

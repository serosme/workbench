<script setup lang="ts">
import type { DropdownMenuItem, TreeItem } from '@nuxt/ui'

const bookmarkForm = useBookmarkForm()
const folderForm = useBookmarkForm()
const moveForm = useMoveForm()
const { tree, bookmarks, refresh } = useBookmarks()
const { remove: removeBookmark } = useRemoveBookmark(refresh)
const { remove: removeFolder } = useRemoveBookmarkFolder(refresh)
const bookmarkMove = useBookmarkMove(bookmarks, refresh)
const { getMenu: getBookmarkMenu } = useBookmarkMenu({ bookmarkForm, moveForm, bookmarkMove, remove: removeBookmark })
const { getMenu: getFolderMenu } = useBookmarkFolderMenu({ bookmarkForm, folderForm, moveForm, bookmarkMove, remove: removeFolder })

const { tree: fileTree, ready: filesReady, upload: uploadFile, refresh: refreshFiles } = useFiles()
const fileUploadForm = useFileUploadForm()
const filePreview = useFilePreview()
const { remove: removeFile } = useRemoveFile(refreshFiles)
const { getMenu: getFileMenu } = useFileMenu({ uploadForm: fileUploadForm, preview: filePreview, remove: removeFile })

const moveTargets = computed(() => buildBookmarkFolderTree(bookmarks.value ?? [], moveForm.modal.item ?? undefined))

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

const contextTree = computed(() => withNodeTokens(tree.value, (item, tokenClass) => ({
  ...item,
  class: `${item.class ?? ''} ${tokenClass}`.trim(),
})))

function openContextMenu(event: MouseEvent) {
  const item = nodeFromEvent(event, contextTree.value.nodes)
  contextBookmark.value = item ? bookmarks.value?.find(b => b.id === item.id) : undefined
}

function getKey(item: TreeItem): string {
  return String(item.id)
}
</script>

<template>
  <div v-if="bookmarks && filesReady" class="flex h-full">
    <aside class="flex h-full w-full min-w-0 flex-col pr-0 md:w-1/2 md:pr-6">
      <UContextMenu :items="contextMenuItems" class="block min-h-0 flex-1">
        <div ref="scrollRef" class="h-full min-h-32 overflow-y-auto scrollbar-none" :style="scrollMask" @contextmenu="openContextMenu">
          <UTree :items="contextTree.items" :get-key="getKey" :ui="treeNavUi" size="xl" />
        </div>
      </UContextMenu>
    </aside>

    <section class="hidden h-full min-w-0 flex-1 flex-col pl-6 md:flex">
      <FileTree :items="fileTree" :get-menu="getFileMenu" />
    </section>

    <BookmarkFormModal
      v-model:open="bookmarkForm.modal.open"
      :parent-id="bookmarkForm.modal.parentId"
      :item="bookmarkForm.modal.item"
      @saved="refresh"
    />
    <BookmarkFolderFormModal
      v-model:open="folderForm.modal.open"
      :parent-id="folderForm.modal.parentId"
      :item="folderForm.modal.item"
      @saved="refresh"
    />
    <MoveFormModal
      v-model:open="moveForm.modal.open"
      :item="moveForm.modal.item"
      :targets="moveTargets"
      @saved="refresh"
    />
    <FileUploadModal
      v-model:open="fileUploadForm.modal.open"
      :default-pathname="fileUploadForm.modal.defaultPathname"
      :upload="uploadFile"
      @saved="refreshFiles"
    />
    <FilePreviewModal
      v-model:open="filePreview.modal.open"
      :pathname="filePreview.modal.pathname"
      :content="filePreview.modal.content"
    />
  </div>
</template>

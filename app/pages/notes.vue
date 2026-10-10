<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const noteForm = useNoteForm()
const { notes, refresh } = useNotes()
const { remove } = useDeleteNote(refresh)
const { getMenu } = useNoteMenu(noteForm, remove)

// 按本地日期把笔记分组（服务端已按 createdAt 倒序，组顺序与组内顺序都顺着来，不再排序）
const groups = computed(() => {
  const map = new Map<string, { date: string, items: Note[] }>()
  for (const note of notes.value) {
    const date = toDateKey(note.writtenAt)
    let group = map.get(date)
    if (!group) {
      group = { date, items: [] }
      map.set(date, group)
    }
    group.items.push(note)
  }
  return [...map.values()]
})

const contextNote = ref<Note>()
const contextMenuItems = computed<DropdownMenuItem[][]>(() => getMenu(contextNote.value))

// 行带 data-note-id，右键时反查记录；点空白处就是根级菜单（新建）
function openContextMenu(event: MouseEvent) {
  const row = (event.target as HTMLElement).closest<HTMLElement>('[data-note-id]')
  contextNote.value = notes.value.find(note => note.id === Number(row?.dataset.noteId))
}
</script>

<template>
  <div class="px-[25vw] py-[10vh] h-screen">
    <UContextMenu :items="contextMenuItems" class="block h-full">
      <div class="h-full overflow-y-auto scrollbar-none" @contextmenu="openContextMenu">
        <div class="space-y-6">
          <!-- ring-inset：描边画进卡片内部，避免被滚动容器（overflow 会把 overflow-x 连带变成 auto）裁掉 -->
          <UCard
            v-for="group in groups"
            :key="group.date"
            :ui="{ root: 'ring-inset', header: 'p-6', body: 'px-6 pt-1.5 pb-1.5 divide-y divide-default sm:pt-1.5 sm:pb-1.5' }"
          >
            <template #header>
              <span class="text-sm font-medium text-muted">{{ formatDateKey(group.date) }}</span>
            </template>
            <div
              v-for="note in group.items"
              :key="note.id"
              :data-note-id="note.id"
              class="flex cursor-pointer items-center py-4.5"
              @click="noteForm.openEdit(note)"
            >
              <p class="min-w-0 truncate text-highlighted">
                {{ note.title }}
              </p>
            </div>
          </UCard>
        </div>
      </div>
    </UContextMenu>

    <NoteFormModal
      v-model:open="noteForm.modal.open"
      :item="noteForm.modal.item"
      @saved="refresh"
    />
    <PageNav />
  </div>
</template>

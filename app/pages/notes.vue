<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const noteForm = useNoteForm()
const { notes, refresh } = useNotes()
const { remove } = useRemoveNote(refresh)
const { getMenu } = useNoteMenu(noteForm, remove)

const groups = computed(() => {
  const map = new Map<string, { date: string, items: Note[] }>()
  for (const note of notes.value) {
    const date = msToDateKey(note.writtenAt)
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

const scrollRef = useTemplateRef<HTMLElement>('scrollRef')
const scrollMask = useScrollMask(scrollRef)

const dayLabel = (date: string) => formatDateKey(date)

function openContextMenu(event: MouseEvent) {
  const row = (event.target as HTMLElement).closest<HTMLElement>('[data-note-id]')
  contextNote.value = notes.value.find(note => note.id === Number(row?.dataset.noteId))
}
</script>

<template>
  <div class="h-full">
    <UContextMenu :items="contextMenuItems" class="block h-full">
      <div ref="scrollRef" class="h-full overflow-y-auto scrollbar-none" :style="scrollMask" @contextmenu="openContextMenu">
        <div class="space-y-6">
          <UCard
            v-for="group in groups"
            :key="group.date"
            :ui="{ root: 'ring-inset', header: 'p-6', body: 'px-6 pt-1.5 pb-1.5 divide-y divide-default sm:pt-1.5 sm:pb-1.5' }"
          >
            <template #header>
              <span class="text-sm font-medium text-muted">{{ dayLabel(group.date) }}</span>
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
  </div>
</template>

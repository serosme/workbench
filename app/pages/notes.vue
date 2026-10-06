<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const noteForm = useNoteForm()
const { notes, refresh } = useNotes()
const { remove } = useDeleteNote(refresh)
const { getMenu } = useNoteMenu(noteForm, remove)

const contextNote = ref<Note>()
const contextMenuItems = computed<DropdownMenuItem[][]>(() => getMenu(contextNote.value))

// 内容区是 pl-30vw / pr-20vw 剩下的 50vw，列数按视口宽度给
const lanes = ref(2)
function updateLanes() {
  lanes.value = window.innerWidth >= 1600 ? 3 : window.innerWidth >= 1000 ? 2 : 1
}
onMounted(() => {
  updateLanes()
  window.addEventListener('resize', updateLanes)
})
onUnmounted(() => window.removeEventListener('resize', updateLanes))

// 卡片自己带 data-note-id，右键时先看点在不在卡片上；点空白处（含卡片下方的空白）就是根级菜单
function openContextMenu(event: MouseEvent) {
  const card = (event.target as HTMLElement).closest<HTMLElement>('[data-note-id]')
  contextNote.value = notes.value.find(n => n.id === Number(card?.dataset.noteId))
}
</script>

<template>
  <div class="pl-[30vw] pr-[20vw] py-[10vh] h-screen">
    <UContextMenu :items="contextMenuItems" class="block h-full">
      <div class="h-full" @contextmenu="openContextMenu">
        <UEmpty
          v-if="!notes.length"
          icon="i-lucide-notebook-pen"
          title="No notes yet"
          description="Right-click the blank area to add one"
          variant="naked"
          class="h-full"
        />
        <UScrollArea
          v-else
          class="h-full"
          :items="notes"
          :virtualize="{ lanes, gap: 16, estimateSize: 180 }"
        >
          <template #default="{ item }">
            <!-- ring-inset：UScrollArea 的 overflow 会裁掉画在卡片盒外的 ring，首行/末行/最左列/最右列的边框会凭空消失 -->
            <UCard
              :data-note-id="item.id"
              :ui="{ root: 'ring-inset' }"
              @click="noteForm.openEdit(item)"
            >
              <!-- text-sm 行高 20px，max-h-40 = 160px 正好 8 行，在整行处裁断；不用 line-clamp 的省略号，也不加渐隐 -->
              <p class="max-h-40 overflow-hidden text-sm break-words whitespace-pre-wrap">
                {{ item.content }}
              </p>
            </UCard>
          </template>
        </UScrollArea>
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

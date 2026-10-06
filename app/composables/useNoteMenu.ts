import type { DropdownMenuItem } from '@nuxt/ui'

export function useNoteMenu(
  noteForm: ReturnType<typeof useNoteForm>,
  remove: (id: number) => Promise<void>,
) {
  function getMenu(note?: Note): DropdownMenuItem[][] {
    if (!note) {
      return [[
        {
          label: 'New Note',
          icon: 'i-lucide-plus',
          onSelect() { noteForm.openCreate() },
        },
      ]]
    }

    return [
      [
        {
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect() { noteForm.openEdit(note) },
        },
      ],
      [
        {
          label: 'Delete',
          icon: 'i-lucide-trash-2',
          color: 'error',
          onSelect() { remove(note.id) },
        },
      ],
    ]
  }

  return { getMenu }
}

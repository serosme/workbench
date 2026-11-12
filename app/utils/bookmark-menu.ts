import type { DropdownMenuItem } from '@nuxt/ui'

const DIRECTIONS: { direction: MoveDirection, label: string, icon: string }[] = [
  { direction: 'up', label: 'Up', icon: 'i-lucide-arrow-up' },
  { direction: 'down', label: 'Down', icon: 'i-lucide-arrow-down' },
  { direction: 'top', label: 'To Top', icon: 'i-lucide-arrow-up-to-line' },
  { direction: 'bottom', label: 'To Bottom', icon: 'i-lucide-arrow-down-to-line' },
]

export interface MoveActions {
  canMove: (id: number, direction: MoveDirection) => boolean
  move: (id: number, direction: MoveDirection) => void
  moving: boolean
  openMove: (bookmark: Bookmark) => void
}

export function moveMenuItem(bookmark: Bookmark, { canMove, move, moving, openMove }: MoveActions): DropdownMenuItem {
  const children: DropdownMenuItem[] = [
    ...DIRECTIONS.map(({ direction, label, icon }) => ({
      label,
      icon,
      disabled: !canMove(bookmark.id, direction),
      onSelect() { move(bookmark.id, direction) },
    })),
    {
      label: 'To Folder',
      icon: 'i-lucide-folder-input',
      onSelect() { openMove(bookmark) },
    },
  ]

  return {
    label: 'Move',
    icon: 'i-lucide-move',
    disabled: moving,
    children,
  }
}

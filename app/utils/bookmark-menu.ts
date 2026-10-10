import type { DropdownMenuItem } from '@nuxt/ui'

// 四个同级移动项结构完全一样，只有方向、文案和图标不同。
// 文案是「Move 之下」的简写：一级已经叫 Move 了，子项再写 Move Up 会重复。
const DIRECTIONS = [
  { direction: 'up', label: 'Up', icon: 'i-lucide-arrow-up' },
  { direction: 'down', label: 'Down', icon: 'i-lucide-arrow-down' },
  { direction: 'top', label: 'To Top', icon: 'i-lucide-arrow-up-to-line' },
  { direction: 'bottom', label: 'To Bottom', icon: 'i-lucide-arrow-down-to-line' },
] as const

/**
 * 节点菜单里的「Move」二级菜单：同级上/下/首/尾，加跨父级的 To Folder（打开移动弹窗）。
 *
 * 五个项挂在同一个 Move 下，一级菜单才不会被撑长；书签节点和文件夹节点共用同一份，所以放在这里。
 * 在途时整个二级菜单禁用（子项各自的 canMove 仍然生效）。
 */
export function moveMenuItem(
  bookmark: Bookmark,
  reorder: ReturnType<typeof useReorderBookmarks>,
  moveForm: ReturnType<typeof useMoveForm>,
): DropdownMenuItem {
  const children: DropdownMenuItem[] = [
    ...DIRECTIONS.map(({ direction, label, icon }) => ({
      label,
      icon,
      disabled: !reorder.canMove(bookmark.id, direction),
      onSelect() { reorder.move(bookmark.id, direction) },
    })),
    {
      label: 'To Folder',
      icon: 'i-lucide-folder-input',
      onSelect() { moveForm.openMove(bookmark) },
    },
  ]

  return {
    label: 'Move',
    icon: 'i-lucide-move',
    disabled: reorder.moving.value,
    children,
  }
}

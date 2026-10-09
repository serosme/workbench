import { sortBookmarks } from '~/utils/bookmark-tree'

// up / down 走一格，top / bottom 走到分组首尾：四者的边界条件与重排方式完全一样，只是目标下标不同。
type MoveDirection = 'up' | 'down' | 'top' | 'bottom'

export function useReorderBookmarks(
  data: Ref<Bookmark[] | null | undefined>,
  refresh: () => Promise<void>,
) {
  const moving = ref(false)

  // id → 所在分组的成员与下标。只在 data 变化时重建一次：
  // 菜单在渲染期求值，每个节点每次渲染都会调 canMove 两次，不能在里面重排全量数据。
  const located = computed(() => {
    const map = new Map<number, { item: Bookmark, group: Bookmark[], index: number }>()
    const groups = new Map<string, Bookmark[]>()
    for (const b of sortBookmarks(data.value ?? [])) {
      const key = `${b.parentId}|${b.type}`
      let group = groups.get(key)
      if (!group)
        groups.set(key, group = [])
      map.set(b.id, { item: b, group, index: group.length })
      group.push(b)
    }
    return map
  })

  function locate(id: number) {
    return located.value.get(id) ?? null
  }

  function canMove(id: number, direction: MoveDirection): boolean {
    if (moving.value)
      return false
    const found = locate(id)
    if (!found)
      return false
    const atStart = direction === 'up' || direction === 'top'
    return atStart ? found.index > 0 : found.index < found.group.length - 1
  }

  // 组内重排统一走 reorder：ids 必须是该 (parentId, type) 分组的完整成员顺序。
  async function reorder(item: Bookmark, ids: number[]) {
    moving.value = true
    try {
      await selfFetch('/api/bookmarks/reorder', {
        method: 'PUT',
        body: { parentId: item.parentId, type: item.type, ids },
      })
      await refresh()
    }
    finally {
      moving.value = false
    }
  }

  async function move(id: number, direction: MoveDirection) {
    const found = locate(id)
    // 已在两端就别动：否则 up 会算出 target = -1，splice(-1, 0, id) 会把这一项插到倒数第二（静默写坏顺序）。
    if (!found || !canMove(id, direction))
      return
    const { item, group, index } = found
    // 先把自己摘出去，再插到目标下标：首/尾一次到位，不用连着调 N 次「上一格」。
    const target = {
      up: index - 1,
      down: index + 1,
      top: 0,
      bottom: group.length - 1,
    }[direction]
    const ids = group.map(b => b.id).filter((_, i) => i !== index)
    ids.splice(target, 0, item.id)
    await reorder(item, ids)
  }

  // 跨父级移动不在这里：由 MoveFormModal 自己发 PUT /api/bookmarks/move，与其他表单弹窗一致（弹窗发请求 + emit，页面 refresh）。
  return { moving, move, canMove }
}

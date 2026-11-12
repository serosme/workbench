export type MoveDirection = 'up' | 'down' | 'top' | 'bottom'

export function useBookmarkMove(
  data: Ref<Bookmark[] | null | undefined>,
  refresh: () => Promise<unknown>,
) {
  const moving = ref(false)

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

  async function persistOrder(item: Bookmark, ids: number[]) {
    moving.value = true
    try {
      await apiFetch('/api/bookmarks/reorder', {
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
    if (!canMove(id, direction))
      return
    const { item, group, index } = locate(id)!
    const target = {
      up: index - 1,
      down: index + 1,
      top: 0,
      bottom: group.length - 1,
    }[direction]
    const ids = group.map(b => b.id)
    ids.splice(index, 1)
    ids.splice(target, 0, item.id)
    await persistOrder(item, ids)
  }

  return { moving, move, canMove }
}

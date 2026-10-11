<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[] = [
  { label: 'Bookmarks', icon: 'i-lucide-bookmark', to: '/bookmarks' },
  { label: 'Files', icon: 'i-lucide-folder-tree', to: '/files' },
  { label: 'Notes', icon: 'i-lucide-notebook-pen', to: '/notes' },
  { label: 'Expenses', icon: 'i-lucide-wallet', to: '/expenses' },
]
</script>

<template>
  <UNavigationMenu
    :items="items"
    orientation="vertical"
    :ui="{ linkLabel: 'sr-only' }"
    class="fixed bottom-4 right-4"
  />
</template>

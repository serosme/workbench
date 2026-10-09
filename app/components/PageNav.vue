<script setup lang="ts">
const route = useRoute()

const links = [
  { to: '/bookmarks', icon: 'i-lucide-bookmark', label: 'Bookmarks' },
  { to: '/files', icon: 'i-lucide-folder-tree', label: 'Files' },
  { to: '/notes', icon: 'i-lucide-notebook-pen', label: 'Notes' },
  { to: '/expenses', icon: 'i-lucide-wallet', label: 'Expenses' },
]

// 当前页不放自己的入口，只留其他页
const others = computed(() => links.filter(link => link.to !== route.path))
</script>

<template>
  <div class="fixed bottom-4 right-4 flex flex-col gap-2">
    <UButton
      v-for="link in others"
      :key="link.to"
      :to="link.to"
      :icon="link.icon"
      :aria-label="link.label"
      color="neutral"
      variant="ghost"
    />
  </div>
</template>

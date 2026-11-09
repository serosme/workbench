<script setup lang="ts">
const props = defineProps<{
  path: string
  content: string
}>()

const open = defineModel<boolean>('open', { required: true })

// 标题只放文件名：完整 path 在文件树里已经看得到，长路径会把标题挤掉
const name = computed(() => props.path.split('/').pop() ?? props.path)

const scrollRef = useTemplateRef<HTMLElement>('scrollRef')
const scrollMask = useScrollMask(scrollRef)
</script>

<template>
  <UModal v-model:open="open" :title="name" :ui="{ content: 'max-w-4xl' }">
    <template #body>
      <div ref="scrollRef" class="max-h-[70dvh] overflow-auto scrollbar-none" :style="scrollMask">
        <pre v-if="content" class="font-mono text-sm whitespace-pre-wrap wrap-break-word">{{ content }}</pre>
        <p v-else class="text-sm text-muted">
          Empty file
        </p>
      </div>
    </template>
  </UModal>
</template>

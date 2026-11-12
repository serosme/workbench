<script setup lang="ts">
const props = defineProps<{
  pathname: string
  content: string
}>()

const open = defineModel<boolean>('open', { required: true })

const name = computed(() => props.pathname.split('/').pop() ?? props.pathname)

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

<script setup lang="ts">
// 页面外壳：满高 + 上下留白 + 左右留白集中在这里（原先散在各页面）。
// 默认不偏移（居中 25/25）；页面写 definePageMeta({ offset: true }) 才切到 30/20（内容右移 5vw），目前只有 bookmarks 用。
const route = useRoute()
const offset = computed(() => route.meta.offset === true)
</script>

<template>
  <div class="h-screen py-[10vh]" :class="offset ? 'pl-[30vw] pr-[20vw]' : 'px-[25vw]'">
    <slot />
  </div>
  <PageNav />
</template>

<script setup lang="ts">
const thinkingText = '正在分析问题，需要时间。先梳理思路，再逐步核对。可用的 Token 不多了，需要节省使用。压缩对话，只保留关键内容，再试一次。'

const typedThinking = ref('')
const thinkingDone = ref(false)
let typingTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  let index = 0

  typingTimer = setInterval(() => {
    if (index < thinkingText.length) {
      typedThinking.value = thinkingText.slice(0, ++index)
      return
    }

    thinkingDone.value = true
    clearInterval(typingTimer)
  }, 12)
})

onUnmounted(() => clearInterval(typingTimer))
</script>

<template>
  <div>
    <UChatReasoning
      :text="typedThinking"
      :streaming="!thinkingDone"
    />

    <Markdown
      v-if="thinkingDone"
      value="余额不足，请充值。"
      class="mt-4 *:first:mt-0 *:last:mb-0"
    />
  </div>
</template>

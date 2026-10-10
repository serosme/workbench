<script setup lang="ts">
const thinkingText = '正在分析这个问题，需要一点时间。思路已基本清晰，但似乎还有遗漏。先回看前面的部分。这样调整后，逻辑通顺多了。稍等，再过一遍，应该差不多了。不对，有一处的调用似乎没接上。从头梳理一遍，把缺的那步补上再检查。这样应该没问题了。再确认一下后面的部分，以免返工。好的，基本就绪，最后做一遍核对，马上就好。'

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
  }, 20)
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
      value="服务器繁忙，请稍后重试。"
      class="mt-4 *:first:mt-0 *:last:mb-0"
    />
  </div>
</template>

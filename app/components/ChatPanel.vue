<script setup lang="ts">
import type { UIMessage } from 'ai'
import { useChat } from '@ai-sdk/vue'
import { isPartStreaming, isToolStreaming } from '@nuxt/ui/utils/ai'
import { DefaultChatTransport, getToolName, isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai'

const props = defineProps<{ models: ChatModel[] }>()

const input = ref('')

const model = ref(props.models[0]?.value ?? '')

const {
  messages,
  status,
  error,
  sendMessage,
  stop,
  regenerate,
  clearError,
} = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
    body: () => ({ model: model.value }),
  }),
})

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) {
    return '上午好'
  }
  if (hour < 18) {
    return '下午好'
  }
  return '晚上好'
}

const displayMessages = computed<UIMessage[]>(() => messages.value.length
  ? messages.value
  : [{
      id: 'greeting',
      role: 'assistant',
      parts: [{ type: 'text', text: `${getGreeting()}，有什么想问的？` }],
    }])

function onNewChat() {
  stop()
  clearError()
  messages.value = []
}

function onSubmit() {
  const text = input.value.trim()

  if (!text) {
    return
  }

  sendMessage({ text })
  input.value = ''
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="min-h-0 flex-1 overflow-y-auto scrollbar-none">
      <UChatMessages
        :messages="displayMessages"
        :status="status"
        should-auto-scroll
      >
        <template #content="{ message }">
          <template
            v-for="(part, index) in message.parts"
            :key="`${message.id}-${index}`"
          >
            <p
              v-if="isTextUIPart(part) && message.role === 'user'"
              class="whitespace-pre-wrap"
            >
              {{ part.text }}
            </p>

            <UChatReasoning
              v-else-if="isReasoningUIPart(part)"
              :text="part.text"
              :streaming="isPartStreaming(part)"
              :ui="{ body: 'max-h-32 scrollbar-none' }"
            />

            <Markdown
              v-else-if="isTextUIPart(part)"
              :value="part.text"
              :streaming="isPartStreaming(part)"
              class="*:first:mt-0 *:last:mb-0"
            />

            <UChatTool
              v-else-if="isToolUIPart(part)"
              :text="getToolName(part)"
              :streaming="isToolStreaming(part)"
            />
          </template>
        </template>
      </UChatMessages>
    </div>

    <div class="pt-4">
      <UChatPrompt
        v-model="input"
        class="w-full"
        :maxrows="12"
        :error="error"
        @submit="onSubmit"
      >
        <template #footer>
          <div class="ml-auto flex items-center gap-1">
            <USelect
              v-model="model"
              :items="models"
              color="neutral"
              variant="ghost"
              size="sm"
              square
            />

            <UButton
              type="button"
              icon="i-lucide-plus"
              color="neutral"
              variant="ghost"
              size="sm"
              square
              :disabled="!messages.length"
              @click="onNewChat"
            />

            <UChatPromptSubmit
              :status="status"
              size="sm"
              :disabled="!input.trim() || !model"
              @stop="stop()"
              @reload="regenerate()"
            />
          </div>
        </template>
      </UChatPrompt>
    </div>
  </div>
</template>

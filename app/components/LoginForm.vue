<script setup lang="ts">
import type { AuthFormField } from '@nuxt/ui'

const emit = defineEmits<{
  loggedIn: []
}>()

const fields: AuthFormField[] = [
  {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: 'Enter password',
    required: true,
  },
]

async function onSubmit({ data }: { data: { password: string } }) {
  await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { password: data.password },
  })
  emit('loggedIn')
}
</script>

<template>
  <UAuthForm
    title="Login"
    icon="i-lucide-lock"
    :fields="fields"
    :submit="{ label: 'Login' }"
    class="w-full"
    @submit="onSubmit"
  />
</template>

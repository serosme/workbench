<script setup lang="ts">
const route = useRoute()
const redirect = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//')
    ? r
    : '/'
})

async function onLoggedIn() {
  await navigateTo(redirect.value)
}
</script>

<template>
  <div class="flex h-full -translate-y-24 items-center justify-center">
    <div class="w-full max-w-sm">
      <LoginForm @logged-in="onLoggedIn" />
    </div>
  </div>
</template>

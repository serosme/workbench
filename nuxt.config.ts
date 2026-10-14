export default defineNuxtConfig({
  compatibilityDate: '2026-10-05',
  devtools: { enabled: true },
  modules: ['@nuxthub/core', '@nuxt/ui', '@comark/nuxt'],
  ssr: false,
  experimental: {
    typedPages: true,
    // 用「服务端路由生成器」而不是 nitro 的 InternalApi 来类型化 $fetch / useFetch：
    // 请求形状（body/query）也能从 handler 的 `defineEventHandler<{ body: T }>` 推断到前端，
    // strictRouteTypes 再把拼错的路径变成报错。Nuxt 5 会默认开启，这里是提前对齐。
    routeTypedFetch: true,
    strictRouteTypes: true,
  },
  runtimeConfig: {
    authPassword: '',
    chatBaseUrl: '',
    chatApiKey: '',
  },
  css: ['~/assets/css/main.css'],
  ui: {
    fonts: false,
  },
  hub: {
    db: 'sqlite',
  },
  routeRules: {
    '/': { redirect: '/bookmarks' },
  },
  app: {
    head: {
      title: 'Workbench',
    },
  },
  icon: {
    provider: 'none',
    clientBundle: {
      scan: {
        globInclude: ['**/*.{vue,jsx,tsx,ts,md,mdc,mdx,yml,yaml}'],
      },
    },
  },
})
